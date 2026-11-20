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
import { uploadMedia, deleteMedia, replaceMedia } from "../../../services/supabaseMedia";
import showMessage from "../../../utils/showMessage";
import confirmAction from "../../../utils/confirmAction";

export default function PopUp({
  visible,
  category,
  onClose,
  embedded = false,
  title,
  description,
  beforeUpload,
  onStateChange,
}) {
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [pendingReplacement, setPendingReplacement] = useState(null);
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
  const selectedPhoto = selectedKeys.length === 1
    ? photos.find((photo) => selectedKeys[0] === `saved-${photo.id}`)
    : null;
  const canReplace = !!selectedPhoto && pendingPhotos.length === 0;
  const isCurrent = (id) => mounted.current && currentCategory.current === id;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    setPendingPhotos([]);
    setPendingReplacement(null);
    setSelectedKeys([]);
  }, [categoryId, visible]);

  useEffect(() => {
    onStateChange?.({ hasPending: pendingPhotos.length > 0 || !!pendingReplacement, working });
  }, [pendingPhotos.length, pendingReplacement, working, onStateChange]);

  const finishClose = () => {
    setPendingPhotos([]);
    setPendingReplacement(null);
    setSelectedKeys([]);
    onClose();
  };

  const handleClose = async () => {
    if (sending.current) return;
    const id = categoryId;
    if (pendingPhotos.length || pendingReplacement) {
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
    if (sending.current || busy || pendingReplacement) return;
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

  const handlePickReplacement = async () => {
    if (sending.current || busy || !canReplace) return;
    const id = categoryId;
    const photo = selectedPhoto;
    sending.current = true;
    setWorking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        if (isCurrent(id)) showMessage("Permissão necessária", "Permita o acesso às fotos para trocar a imagem.");
        return;
      }
      if (!isCurrent(id)) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.9, base64: true,
      });
      if (result.canceled || !result.assets?.[0] || !isCurrent(id)) return;
      setPendingReplacement({ mediaId: photo.id, expectedPath: photo.imagem_url, asset: result.assets[0] });
    } catch {
      if (isCurrent(id)) showMessage("Não foi possível selecionar", "Tente abrir suas fotos novamente.");
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  const handleSave = async () => {
    if (sending.current || busy) return;
    if (!pendingPhotos.length && !pendingReplacement) {
      showMessage(
        "Nenhuma imagem nova",
        "Toque no botão + para escolher imagens.",
      );
      return;
    }

    const id = categoryId;
    const saved = [];
    let replacementSaved = false;
    let failure = "";
    sending.current = true;
    setWorking(true);
    try {
      if (beforeUpload) {
        try {
          await beforeUpload();
        } catch (error) {
          if (isCurrent(id)) {
            showMessage(
              "Não foi possível preparar as mídias",
              `${error.message || "Tente novamente."} As imagens continuam selecionadas para salvar.`,
            );
          }
          return;
        }
        if (!isCurrent(id)) return;
      }
      if (pendingReplacement) {
        try {
          await replaceMedia({ categoryId: id, ...pendingReplacement });
          replacementSaved = true;
        } catch (error) {
          failure = error.message;
        }
      }
      for (const photo of pendingPhotos) {
        if (failure) break;
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
      if (replacementSaved) {
        setPendingReplacement(null);
        setSelectedKeys([]);
      }
      const savedCount = saved.length + (replacementSaved ? 1 : 0);
      if (savedCount) setRefreshKey((key) => key + 1);
      if (failure) {
        showMessage("Não foi possível salvar todas as mídias", `${savedCount} imagem(ns) salva(s). ${failure} As demais continuam selecionadas para tentar novamente.`);
      } else {
        showMessage("Mídias salvas", "As imagens foram salvas nesta categoria no Supabase.");
      }
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  const toggleSelection = (key) => {
    if (busy || pendingReplacement) return;
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const handleDelete = async () => {
    if (sending.current || busy || pendingReplacement || !selectedKeys.length) return;
    const id = categoryId;
    sending.current = true;
    setWorking(true);
    const removed = selectedKeys.filter((key) => key.startsWith("pending-"));
    let failure = "";
    let deletedCount = 0;
    let preservedFiles = 0;
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
          const result = await deleteMedia({ categoryId: id, mediaId: photo.id, expectedPath: photo.imagem_url });
          if (result?.filePreserved) preservedFiles += 1;
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
      else if (preservedFiles) {
        showMessage("Imagens retiradas da categoria", "Alguns arquivos antigos foram mantidos no armazenamento porque não foi possível confirmar uma limpeza segura.");
      }
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  const gridItems = [
    { key: "add-image", kind: "add" },
    ...photos.map((photo) => ({
      ...photo,
      uri: pendingReplacement?.mediaId === photo.id ? pendingReplacement.asset.uri : photo.uri,
      key: `saved-${photo.id}`,
      selectionKey: `saved-${photo.id}`,
      kind: "saved",
    })),
    ...pendingPhotos,
  ];

  const content = (
        <View style={[styles.modalCard, embedded && styles.embeddedCard]}>
          <View style={[styles.header, embedded && styles.embeddedHeader]}>
            {embedded && (
              <TouchableOpacity
                onPress={handleClose}
                disabled={working}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Voltar do carrossel"
              >
                <Feather name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <Text style={[styles.title, embedded && styles.embeddedTitle]} numberOfLines={1}>
              {title || category?.categoria}
            </Text>
            {!embedded && (
              <TouchableOpacity
                onPress={handleClose}
                disabled={working}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fechar mídias"
              >
                <Feather name="x" size={24} color="#002D62" />
              </TouchableOpacity>
            )}
          </View>

          {!!description && <Text style={styles.description}>{description}</Text>}
          {media.loading && <Text style={styles.statusText}>Carregando mídias...</Text>}
          {!!media.errorMessage && <Text style={styles.errorText}>Não foi possível carregar as mídias. Reabra a categoria para tentar novamente.</Text>}
          <FlatList
            style={embedded ? styles.embeddedList : undefined}
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
                    disabled={busy || !!pendingReplacement}
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
                  disabled={busy || !!pendingReplacement}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={
                    isSelected
                      ? "Desmarcar imagem"
                      : "Selecionar imagem para trocar ou apagar"
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

          {pendingReplacement && (
            <View style={styles.replacementNotice}>
              <Text style={styles.selectionText}>Troca pendente. Toque em Salvar para publicar a nova imagem.</Text>
              <TouchableOpacity
                onPress={() => { if (!sending.current) setPendingReplacement(null); }}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Cancelar troca da imagem"
              >
                <Text style={styles.cancelReplacementText}>Cancelar troca</Text>
              </TouchableOpacity>
            </View>
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
              style={[styles.replaceButton, (!canReplace || busy) && styles.disabledButton]}
              onPress={handlePickReplacement}
              disabled={!canReplace || busy}
              accessibilityRole="button"
              accessibilityLabel="Trocar imagem selecionada"
              accessibilityState={{ disabled: !canReplace || busy }}
            >
              <Feather name="refresh-cw" size={16} color="#002D62" />
              <Text style={styles.replaceText}>Trocar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                (!selectedKeys.length || busy || pendingReplacement) && styles.disabledButton,
              ]}
              onPress={handleDelete}
              disabled={!selectedKeys.length || busy || !!pendingReplacement}
              accessibilityRole="button"
              accessibilityLabel="Apagar imagens selecionadas"
            >
              <Feather name="trash-2" size={19} color="#002D62" />
            </TouchableOpacity>
          </View>
        </View>
  );

  if (embedded) return visible ? content : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        {content}
      </View>
    </Modal>
  );
}
