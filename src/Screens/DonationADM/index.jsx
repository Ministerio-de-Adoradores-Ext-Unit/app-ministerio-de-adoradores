import React, { useState } from "react";
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
import {
  addDonationCampaign,
  donationCampaigns,
  getDonationCampaignSource,
  removeDonationCampaign,
} from "./data";

export default function DonationADM() {
  const navigation = useNavigation();
  const [campaigns, setCampaigns] = useState(donationCampaigns);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [imageUri, setImageUri] = useState("");

  const openCreateModal = () => {
    setTitle("");
    setImageUri("");
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setTitle("");
    setImageUri("");
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSaveCampaign = () => {
    if (!title.trim() || !imageUri) return;

    const newCampaign = {
      id: Date.now(),
      title: title.trim(),
      subtitle: "",
      description: "",
      imageUri: imageUri,
      image: null,
    };

    addDonationCampaign(newCampaign);
    setCampaigns(donationCampaigns);
    handleCloseModal();
  };

  const handleDeleteCampaign = (id) => {
    removeDonationCampaign(id);
    setCampaigns(donationCampaigns);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={25} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>ADMINISTRAR DOAÇÕES</Text>

        <TouchableOpacity
          style={styles.addCard}
          onPress={openCreateModal}
          activeOpacity={0.85}
        >
          <Text style={styles.addText}>Adicionar Campanha</Text>
          <View style={styles.plusCircle}>
            <Icon name="plus" size={38} color="#0B233E" />
          </View>
        </TouchableOpacity>

        <Text style={styles.listTitle}>CAMPANHAS</Text>

        <View style={styles.list}>
          {campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.campaignCard}>
              <Image
                source={getDonationCampaignSource(campaign)}
                style={styles.campaignImage}
              />

              <View style={styles.campaignInfo}>
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteCampaign(campaign.id)}
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
              <Text style={styles.modalTitle}>ADICIONAR</Text>
              <TouchableOpacity
                onPress={handleCloseModal}
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
            />

            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSaveCampaign}
              >
                <Text style={styles.primaryButtonText}>Salvar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={handlePickImage}
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
