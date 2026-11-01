import React, { useEffect, useState } from "react";
import {
  Alert,
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

export default function PopUp({
  visible,
  category,
  photos = [],
  onPhotosChange,
  onClose,
}) {
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  useEffect(() => {
    setPendingPhotos([]);
    setSelectedKeys([]);
  }, [category?.id, visible]);

  const finishClose = () => {
    setPendingPhotos([]);
    setSelectedKeys([]);
    onClose();
  };

  const handleClose = () => {
    if (pendingPhotos.length) {
      Alert.alert(
        "Descartar imagens?",
        "As imagens ainda não salvas serão removidas desta seleção.",
        [
          { text: "Continuar editando", style: "cancel" },
          { text: "Descartar", style: "destructive", onPress: finishClose },
        ],
      );
      return;
    }
    finishClose();
  };

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "Permita o acesso às fotos para adicionar mídias.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 0.9,
    });

    if (result.canceled) return;
    const added = result.assets.map((asset, index) => {
      const selectionKey = `pending-${Date.now()}-${index}`;
      return { ...asset, key: selectionKey, selectionKey, kind: "pending" };
    });
    setPendingPhotos((current) => [...current, ...added]);
  };

  const handleSave = () => {
    if (!pendingPhotos.length) {
      Alert.alert(
        "Nenhuma imagem nova",
        "Toque no botão + para escolher imagens.",
      );
      return;
    }

    const savedPhotos = pendingPhotos.map((photo) => ({
      id: photo.selectionKey,
      uri: photo.uri,
    }));
    onPhotosChange([...photos, ...savedPhotos]);
    setPendingPhotos([]);
    setSelectedKeys([]);
    Alert.alert(
      "Mídias salvas",
      "As imagens foram adicionadas a esta categoria.",
    );
  };

  const toggleSelection = (key) => {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const handleDelete = () => {
    if (!selectedKeys.length) return;
    Alert.alert(
      "Apagar imagens selecionadas?",
      `${selectedKeys.length} imagem(ns) serão removidas desta categoria.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Apagar", style: "destructive", onPress: confirmDelete },
      ],
    );
  };

  const confirmDelete = () => {
    const remainingPhotos = photos.filter(
      (photo) => !selectedKeys.includes(`saved-${photo.id}`),
    );
    const remainingPending = pendingPhotos.filter(
      (photo) => !selectedKeys.includes(photo.selectionKey),
    );
    onPhotosChange(remainingPhotos);
    setPendingPhotos(remainingPending);
    setSelectedKeys([]);
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
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar mídias"
            >
              <Feather name="x" size={24} color="#002D62" />
            </TouchableOpacity>
          </View>

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
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={
                    isSelected
                      ? "Desmarcar imagem"
                      : "Selecionar imagem para apagar"
                  }
                >
                  <Image source={{ uri: item.uri }} style={styles.image} />
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
              accessibilityRole="button"
            >
              <Text style={styles.saveText}>SALVAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                !selectedKeys.length && styles.disabledButton,
              ]}
              onPress={handleDelete}
              disabled={!selectedKeys.length}
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
