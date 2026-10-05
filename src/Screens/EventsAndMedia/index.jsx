import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
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

const events = [
  {
    id: "irmas",
    title: "Culto das Irmãs",
    image: require("../../../assets/img/Rectangle 1.png"),
  },
  {
    id: "jovens",
    title: "Culto dos Jovens",
    image: require("../../../assets/img/ctn_terceiro.png"),
  },
  {
    id: "santa-ceia",
    title: "Santa Ceia",
    image: require("../../../assets/img/ctn_primeiro.png"),
  },
];

const mediaPhotos = [
  require("../../../assets/img/Rectangle 1.png"),
  require("../../../assets/img/ctn_primeiro.png"),
  require("../../../assets/img/ctn_terceiro.png"),
  require("../../../assets/img/banner_doacao_1.png"),
  require("../../../assets/img/banner_doacao_2.png"),
];

const mediaCategories = [
  { id: "congresso", title: "CONGRESSO", image: events[0].image },
  { id: "santa-ceia", title: "SANTA CEIA", image: events[2].image },
  { id: "jovens", title: "CULTO JOVEM", image: events[1].image },
  { id: "irmas", title: "CULTO DAS IRMÃS", image: events[0].image },
  { id: "criancas", title: "CULTO INFANTIL", image: events[2].image },
];

const EventsAndMedia = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const savePhoto = async (source) => {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso às fotos para salvar esta imagem.",
        );
        return;
      }

      const asset = await Asset.fromModule(source).downloadAsync();
      await MediaLibrary.saveToLibraryAsync(asset.localUri || asset.uri);
      Alert.alert(
        "Foto salva",
        "A imagem foi salva na galeria do dispositivo.",
      );
    } catch {
      Alert.alert("Não foi possível salvar", "Tente novamente em instantes.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TitleComponent title="EVENTOS" />

        <FlatList
          data={events}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventList}
          renderItem={({ item }) => (
            <View style={styles.eventCard}>
              <Image source={item.image} style={styles.eventImage} />
              <Text style={styles.eventTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.eventDetail}>
                <Feather
                  name="map-pin"
                  size={11}
                  color="#fff"
                  style={styles.detailIcon}
                />
                <Text style={styles.eventDetailText}>Local a confirmar</Text>
              </View>
              <View style={styles.eventDetail}>
                <Feather
                  name="calendar"
                  size={11}
                  color="#fff"
                  style={styles.detailIcon}
                />
                <Text style={styles.eventDetailText}>Data a confirmar</Text>
              </View>
              <View style={styles.eventDetail}>
                <Feather
                  name="clock"
                  size={11}
                  color="#fff"
                  style={styles.detailIcon}
                />
                <Text style={styles.eventDetailText}>Horário a confirmar</Text>
              </View>
            </View>
          )}
        />

        <TitleComponent title="MÍDIAS" />
        <FlatList
          data={mediaCategories}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => setSelectedCategory(item)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir fotos: ${item.title}`}
            >
              <Image source={item.image} style={styles.categoryImage} />
              <Text style={styles.categoryTitle} numberOfLines={2}>
                {item.title}
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
              <Text style={styles.modalTitle}>{selectedCategory?.title}</Text>
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
              data={mediaPhotos}
              numColumns={2}
              keyExtractor={(_, index) => `${selectedCategory?.id}-${index}`}
              contentContainerStyle={styles.photoGrid}
              columnWrapperStyle={styles.photoRow}
              renderItem={({ item }) => (
                <View style={styles.photoItem}>
                  <Image source={item} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => savePhoto(item)}
                    accessibilityRole="button"
                    accessibilityLabel="Salvar foto na galeria"
                  >
                    <Feather name="download" size={18} color="#fff" />
                  </TouchableOpacity>
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
