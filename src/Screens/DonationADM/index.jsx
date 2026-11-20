import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import styles from "./style";
import { getDonationCampaignSource } from "./data";
import useScreenData from "../../hooks/useScreenData";
import { deleteDonationCampaign, listDonationCampaigns, saveDonationCampaign } from "../../services/supabaseDonations";
import showMessage from "../../utils/showMessage";
import confirmAction from "../../utils/confirmAction";

export default function DonationADM() {
  const navigation = useNavigation();
  const [refreshKey, setRefreshKey] = useState(0);
  const loadCampaigns = useCallback(() => listDonationCampaigns(), [refreshKey]);
  const { data: campaigns, loading, errorMessage } = useScreenData(loadCampaigns, { authenticated: true });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [title, setTitle] = useState("");
  const [imageAsset, setImageAsset] = useState(null);
  const [working, setWorking] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);
  const busy = loading || working;
  const previewSource = imageAsset ? { uri: imageAsset.uri } : getDonationCampaignSource(editingCampaign);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const openCampaignModal = (campaign = null) => {
    if (sending.current || loading) return;
    setEditingCampaign(campaign);
    setTitle(campaign?.title || "");
    setImageAsset(null);
    setIsModalVisible(true);
  };

  const resetCreateModal = () => {
    setIsModalVisible(false);
    setEditingCampaign(null);
    setTitle("");
    setImageAsset(null);
  };

  const handleCloseModal = () => {
    if (!sending.current) resetCreateModal();
  };

  const handlePickImage = async () => {
    if (sending.current) return;
    sending.current = true;
    setWorking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage("Permissão necessária", "Permita o acesso às fotos para selecionar a imagem da campanha.");
        return;
      }
      if (!mounted.current) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: true, quality: 0.9, base64: true,
      });
      if (!result.canceled && result.assets?.[0] && mounted.current) setImageAsset(result.assets[0]);
    } catch {
      if (mounted.current) showMessage("Não foi possível selecionar", "Tente abrir suas fotos novamente.");
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (sending.current) return;
    if (!title.trim() || (!editingCampaign && !imageAsset)) {
      showMessage("Preencha a campanha", editingCampaign ? "Informe um título." : "Informe um título e selecione uma imagem.");
      return;
    }

    sending.current = true;
    setWorking(true);
    try {
      const { cleanupPending } = await saveDonationCampaign({
        id: editingCampaign?.id,
        title,
        imageAsset,
      });
      if (mounted.current) {
        resetCreateModal();
        setRefreshKey((key) => key + 1);
        if (cleanupPending) showMessage("Campanha atualizada", "A foto antiga já saiu do app. A remoção do arquivo antigo ficou pendente.");
      }
    } catch (error) {
      if (mounted.current) showMessage("Não foi possível salvar a campanha", error.message);
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    if (sending.current) return;
    sending.current = true;
    setWorking(true);
    try {
      const confirmed = await confirmAction(
        "Apagar campanha?",
        `A campanha “${campaign.title}” será removida para todos.`,
        "Apagar",
      );
      if (!confirmed || !mounted.current) return;
      const { cleanupPending } = await deleteDonationCampaign(campaign.id);
      if (mounted.current) {
        setRefreshKey((key) => key + 1);
        if (cleanupPending) showMessage("Campanha removida", "A campanha já saiu do app. A remoção do arquivo antigo ficou pendente.");
      }
    } catch (error) {
      if (mounted.current) showMessage("Não foi possível apagar a campanha", error.message);
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar de doações"
        >
          <Icon name="arrow-left" size={25} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>ADMINISTRAR DOAÇÕES</Text>

        <TouchableOpacity
          style={styles.addCard}
          onPress={() => openCampaignModal()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Adicionar campanha"
          activeOpacity={0.85}
        >
          <Text style={styles.addText}>Adicionar Campanha</Text>
          <View style={styles.plusCircle}>
            <Icon name="plus" size={38} color="#0B233E" />
          </View>
        </TouchableOpacity>

        <Text style={styles.listTitle}>CAMPANHAS</Text>

        <View style={styles.list}>
          {loading && <Text style={styles.campaignTitle}>Carregando campanhas...</Text>}
          {!!errorMessage && <Text style={styles.campaignTitle} accessibilityRole="alert">{errorMessage}</Text>}
          {!loading && !errorMessage && campaigns.length === 0 && (
            <Text style={styles.campaignTitle}>Nenhuma campanha disponível.</Text>
          )}
          {campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.campaignCard}>
              {getDonationCampaignSource(campaign) && (
                <Image source={getDonationCampaignSource(campaign)} style={styles.campaignImage} />
              )}

              <View style={styles.campaignInfo}>
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => openCampaignModal(campaign)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar campanha: ${campaign.title}`}
                >
                  <Icon name="edit-2" size={18} color="#0B233E" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteCampaign(campaign)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Apagar campanha: ${campaign.title}`}
                  accessibilityState={{ disabled: busy, busy: working }}
                >
                  <Icon name="trash-2" size={18} color="#0B233E" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCampaign ? "EDITAR" : "ADICIONAR"}</Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                disabled={working}
                accessibilityRole="button"
                accessibilityLabel="Fechar campanha"
                style={styles.closeButton}
              >
                <Icon name="x" size={22} color="#1D1D1D" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Título da campanha"
              placeholderTextColor="#0B233E"
              value={title}
              onChangeText={setTitle}
              editable={!working}
            />

            {previewSource ? (
              <Image source={previewSource} style={styles.previewImage} />
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSaveCampaign}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Salvar campanha"
              >
                <Text style={styles.primaryButtonText}>{working ? "Aguarde..." : "Salvar"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={handlePickImage}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={editingCampaign ? "Trocar imagem da campanha" : "Escolher imagem da campanha"}
              >
                <Icon name="image" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
