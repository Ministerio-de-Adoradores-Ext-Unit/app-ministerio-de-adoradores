import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Feather from "react-native-vector-icons/Feather";
import styles from "./style";
import useScreenData from "../../../hooks/useScreenData";
import { listMediaByCategory } from "../../../services/supabaseData";
import { uploadMedia, deleteMedia } from "../../../services/supabaseMedia";
import showMessage from "../../../utils/showMessage";
import confirmAction from "../../../utils/confirmAction";

export default function PopUp({
  visible,
  category,
  onClose,
}) {
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [working, setWorking] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const sending = useRef(false);
  const mounted = useRef(true);
  const categoryId = category?.id;
  const currentCategory = useRef(categoryId);
  currentCategory.current = visible ? categoryId : null;
  const loadPhotos = useCallback(
    () => listMediaByCategory(visible ? categoryId : null),
    [categoryId, visible, refreshKey],
  );
  const media = useScreenData(loadPhotos, {
    authenticated: true,
    refreshMs: visible ? 50 * 60 * 1000 : 0,
  });
  const photos = media.data.map((photo) => ({ ...photo, uri: photo.imageUrl }));
  const busy = working || media.loading;
  const isCurrent = (id) => mounted.current && currentCategory.current === id;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    setPendingPhotos([]);
    setSelectedKeys([]);
  }, [categoryId, visible]);

  const finishClose = () => {
    setPendingPhotos([]);
    setSelectedKeys([]);
    onClose();
  };

  const handleClose = async () => {
    if (sending.current) return;
    const id = categoryId;
    if (pendingPhotos.length) {
      const discard = await confirmAction(
        "Descartar imagens?",
        "As imagens ainda não salvas serão removidas desta seleção.",
        "Descartar",
      );
      if (!discard) return;
    }
    if (isCurrent(id)) finishClose();
  };

  const handlePickImages = async () => {
    if (sending.current || busy) return;
    const id = categoryId;
    sending.current = true;
    setWorking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage("Permissão necessária", "Permita o acesso às fotos para adicionar mídias.");
        return;
      }
      if (!isCurrent(id)) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: 0.9,
        base64: true,
      });
      if (result.canceled || !isCurrent(id)) return;
      const added = result.assets.map((asset, index) => {
        const selectionKey = `pending-${Date.now()}-${index}`;
        return { ...asset, key: selectionKey, selectionKey, kind: "pending" };
      });
      setPendingPhotos((current) => [...current, ...added]);
    } catch {
      if (isCurrent(id)) showMessage("Não foi possível selecionar", "Tente abrir suas fotos novamente.");
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  const handleSave = async () => {
    if (sending.current || busy) return;
    if (!pendingPhotos.length) {
      showMessage(
        "Nenhuma imagem nova",
        "Toque no botão + para escolher imagens.",
      );
      return;
    }

    const id = categoryId;
    const saved = [];
    let failure = "";
    sending.current = true;
    setWorking(true);
    try {
      for (const photo of pendingPhotos) {
        if (!isCurrent(id)) break;
        try {
          await uploadMedia({ categoryId: id, asset: photo });
          saved.push(photo.selectionKey);
        } catch (error) {
          failure = error.message;
          break;
        }
      }
      if (!isCurrent(id)) return;
      setPendingPhotos((current) => current.filter((photo) => !saved.includes(photo.selectionKey)));
      setSelectedKeys((current) => current.filter((key) => !saved.includes(key)));
      if (saved.length) setRefreshKey((key) => key + 1);
      if (failure) {
        showMessage("Não foi possível salvar todas as mídias", `${saved.length} imagem(ns) salva(s). ${failure} As demais continuam selecionadas para tentar novamente.`);
      } else {
        showMessage("Mídias salvas", "As imagens foram adicionadas a esta categoria no Supabase.");
      }
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  const toggleSelection = (key) => {
    if (busy) return;
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const handleDelete = async () => {
    if (sending.current || busy || !selectedKeys.length) return;
    const id = categoryId;
    sending.current = true;
    setWorking(true);
    const removed = selectedKeys.filter((key) => key.startsWith("pending-"));
    let failure = "";
    let deletedCount = 0;
    try {
      const confirmed = await confirmAction(
        "Apagar imagens selecionadas?",
        `${selectedKeys.length} imagem(ns) serão removidas desta categoria.`,
        "Apagar",
      );
      if (!confirmed || !isCurrent(id)) return;
      for (const photo of photos.filter((item) => selectedKeys.includes(`saved-${item.id}`))) {
        if (!isCurrent(id)) break;
        try {
          await deleteMedia({ categoryId: id, mediaId: photo.id });
          removed.push(`saved-${photo.id}`);
          deletedCount += 1;
        } catch (error) {
          failure = error.message;
          break;
        }
      }
      if (!isCurrent(id)) return;
      setPendingPhotos((current) => current.filter((photo) => !removed.includes(photo.selectionKey)));
      setSelectedKeys((current) => current.filter((key) => !removed.includes(key)));
      if (deletedCount) setRefreshKey((key) => key + 1);
      if (failure) showMessage("Não foi possível apagar todas as mídias", failure);
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  const gridItems = [
    { key: "add-image", kind: "add" },
    ...photos.map((photo) => ({
      ...photo,
      key: `saved-${photo.id}`,
      selectionKey: `saved-${photo.id}`,
      kind: "saved",
    })),
    ...pendingPhotos,
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {category?.categoria}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={working}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar mídias"
            >
              <Feather name="x" size={24} color="#002D62" />
            </TouchableOpacity>
          </View>

          {media.loading && <Text style={styles.statusText}>Carregando mídias...</Text>}
          {!!media.errorMessage && <Text style={styles.errorText}>Não foi possível carregar as mídias. Reabra a categoria para tentar novamente.</Text>}
          <FlatList
            data={gridItems}
            numColumns={3}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (item.kind === "add") {
                return (
                  <TouchableOpacity
                    style={styles.imageTile}
                    onPress={handlePickImages}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar imagens"
                  >
                    <Feather name="plus-circle" size={35} color="#fff" />
                  </TouchableOpacity>
                );
              }

              const isSelected = selectedKeys.includes(item.selectionKey);
              return (
                <TouchableOpacity
                  style={[styles.imageTile, isSelected && styles.selectedTile]}
                  onPress={() => toggleSelection(item.selectionKey)}
                  disabled={busy}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={
                    isSelected
                      ? "Desmarcar imagem"
                      : "Selecionar imagem para apagar"
                  }
                >
                  {item.uri ? <Image source={{ uri: item.uri }} style={styles.image} /> : <Text style={styles.saveText}>Imagem indisponível</Text>}
                  {isSelected && (
                    <View style={styles.selectionMark}>
                      <Feather name="check" size={22} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {selectedKeys.length > 0 && (
            <Text style={styles.selectionText}>
              {selectedKeys.length} selecionada(s)
            </Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Salvar mídias"
              accessibilityState={{ disabled: busy, busy: working }}
            >
              <Text style={styles.saveText}>{working ? "AGUARDE..." : "SALVAR"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                (!selectedKeys.length || busy) && styles.disabledButton,
              ]}
              onPress={handleDelete}
              disabled={!selectedKeys.length || busy}
              accessibilityRole="button"
              accessibilityLabel="Apagar imagens selecionadas"
            >
              <Feather name="trash-2" size={19} color="#002D62" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
