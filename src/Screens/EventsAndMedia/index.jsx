import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Asset } from "expo-asset";
import * as MediaLibrary from "expo-media-library";
import Feather from "react-native-vector-icons/Feather";
import styles from "./style";
import SearchHeader from "../../components/header/searchHeader";
import NavBar from "../../components/navBar";
import TitleComponent from "../../components/titles";
import useScreenData, { PUBLIC_CONTENT_REFRESH_MS } from "../../hooks/useScreenData";
import showMessage from "../../utils/showMessage";
import { HOME_CAROUSEL_CATEGORY } from "../../services/supabaseCarousel";
import {
  listEventsWithImages,
  listGalleryCategoriesWithImages,
  listMediaByCategory,
} from "../../services/supabaseData";

const loadGalleryCategories = () => listGalleryCategoriesWithImages(HOME_CAROUSEL_CATEGORY.id);
const normalizeSearch = (value) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

// A arte padrão fica disponível para categorias sem uma foto publicada.
const categoryCover = (name) => {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("jov")) {
    return require("../../../assets/img/ctn_terceiro.png");
  }
  if (normalized.includes("ceia") || normalized.includes("crianca")) {
    return require("../../../assets/img/ctn_primeiro.png");
  }
  return require("../../../assets/img/Rectangle 1.png");
};

const DatabaseImage = ({ imageUrl, style, fallback }) => {
  const [failedUrl, setFailedUrl] = useState(null);
  return imageUrl && imageUrl !== failedUrl ? (
    <Image source={{ uri: imageUrl }} style={style} onError={() => setFailedUrl(imageUrl)} />
  ) : fallback ? <Image source={fallback} style={style} />
    : <View style={style}><Text>Imagem indisponível</Text></View>;
};

const EventsAndMedia = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const savingPhoto = useRef(false);
  const events = useScreenData(listEventsWithImages, {
    refreshMs: PUBLIC_CONTENT_REFRESH_MS, backgroundRefresh: true,
  });
  const categories = useScreenData(loadGalleryCategories, {
    refreshMs: PUBLIC_CONTENT_REFRESH_MS, backgroundRefresh: true,
  });
  const categoryId = selectedCategory?.id;
  const loadPhotos = useCallback(() => listMediaByCategory(categoryId), [categoryId]);
  const photos = useScreenData(loadPhotos, {
    refreshMs: categoryId ? PUBLIC_CONTENT_REFRESH_MS : 0, backgroundRefresh: true,
  });
  const query = normalizeSearch(search);
  const filteredEvents = events.data.filter((event) =>
    normalizeSearch(`${event.titulo} ${event.local || ""}`).includes(query),
  );
  const filteredCategories = categories.data.filter((category) =>
    normalizeSearch(category.categoria).includes(query),
  );

  const savePhoto = async (imageUrl) => {
    if (!imageUrl || savingPhoto.current) return;
    savingPhoto.current = true;
    try {
      if (Platform.OS === "web") {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("Não foi possível baixar a imagem.");
        const downloadUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop()) || "foto.jpg";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 60 * 1000);
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        showMessage(
          "Permissão necessária",
          "Permita o acesso às fotos para salvar esta imagem.",
        );
        return;
      }

      const asset = await Asset.fromURI(imageUrl).downloadAsync();
      await MediaLibrary.Asset.create(asset.localUri || asset.uri);
      showMessage(
        "Foto salva",
        "A imagem foi salva na galeria do dispositivo.",
      );
    } catch {
      showMessage("Não foi possível salvar", "Tente novamente em instantes.");
    } finally {
      savingPhoto.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchHeader value={search} onChangeText={setSearch} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TitleComponent title="EVENTOS" />

        <FlatList
          data={filteredEvents}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventList}
          ListEmptyComponent={
            <Text accessibilityLiveRegion="polite">
              {events.loading ? "Carregando eventos..." : events.errorMessage
                ? "Não foi possível carregar os eventos. Reabra a tela para tentar novamente."
                : query && events.data.length ? "Nenhum evento encontrado." : "Nenhum evento disponível."}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.eventCard}>
              <DatabaseImage imageUrl={item.imageUrl} style={styles.eventImage} />
              <Text style={styles.eventTitle} numberOfLines={1}>
                {item.titulo}
              </Text>
              <View style={styles.eventDetail}>
                <Feather
                  name="map-pin"
                  size={11}
                  color="#fff"
                  style={styles.detailIcon}
                />
                <Text style={styles.eventDetailText}>{item.local || "Local a confirmar"}</Text>
              </View>
              <View style={styles.eventDetail}>
                <Feather
                  name="calendar"
                  size={11}
                  color="#fff"
                  style={styles.detailIcon}
                />
                <Text style={styles.eventDetailText}>
                  {item.data ? item.data.split("-").reverse().join("/") : "Data a confirmar"}
                </Text>
              </View>
              <View style={styles.eventDetail}>
                <Feather
                  name="clock"
                  size={11}
                  color="#fff"
                  style={styles.detailIcon}
                />
                <Text style={styles.eventDetailText}>{item.horario?.slice(0, 5) || "Horário a confirmar"}</Text>
              </View>
            </View>
          )}
        />

        <TitleComponent title="MÍDIAS" />
        <FlatList
          data={filteredCategories}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          ListEmptyComponent={
            <Text accessibilityLiveRegion="polite">
              {categories.loading ? "Carregando categorias..." : categories.errorMessage
                ? "Não foi possível carregar as categorias. Reabra a tela para tentar novamente."
                : query && categories.data.length ? "Nenhuma categoria encontrada." : "Nenhuma categoria disponível."}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => setSelectedCategory(item)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir fotos: ${item.categoria}`}
            >
              <DatabaseImage
                imageUrl={item.imageUrl}
                fallback={categoryCover(item.categoria)}
                style={styles.categoryImage}
              />
              <Text style={styles.categoryTitle} numberOfLines={2}>
                {item.categoria.toUpperCase()}
              </Text>
            </TouchableOpacity>
          )}
        />
      </ScrollView>

      <Modal
        visible={selectedCategory !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCategory(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedCategory?.categoria.toUpperCase()}</Text>
              <TouchableOpacity
                onPress={() => setSelectedCategory(null)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fechar galeria"
              >
                <Feather name="x" size={23} color="#102338" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={photos.data}
              numColumns={2}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.photoGrid}
              columnWrapperStyle={styles.photoRow}
              ListEmptyComponent={
                <Text accessibilityLiveRegion="polite">
                  {photos.loading ? "Carregando fotos..." : photos.errorMessage
                    ? "Não foi possível carregar as fotos. Reabra a categoria para tentar novamente."
                    : "Nenhuma mídia cadastrada nesta categoria."}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.photoItem}>
                  <DatabaseImage imageUrl={item.imageUrl} style={styles.photoImage} />
                  {item.imageUrl && <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => savePhoto(item.imageUrl)}
                    accessibilityRole="button"
                    accessibilityLabel="Salvar foto na galeria"
                  >
                    <Feather name="download" size={18} color="#fff" />
                  </TouchableOpacity>}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <NavBar />
    </SafeAreaView>
  );
};

export default EventsAndMedia;
