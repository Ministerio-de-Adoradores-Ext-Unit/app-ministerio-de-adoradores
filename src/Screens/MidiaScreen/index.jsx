import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import NavBar from "../../components/navBar";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Feather";
import { listMediaCategories } from "../../services/supabaseData";
import useScreenData from "../../hooks/useScreenData";

export default function MidiaScreen() {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState("");
  const categoriesState = useScreenData(listMediaCategories);
  const categories = categoriesState.data;
  const { loading, errorMessage } = categoriesState;

  const filteredCategories = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((item) =>
      item.categoria.toLowerCase().includes(query)
    );
  }, [categories, searchText]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Título */}
        <Text style={styles.title}>GERENCIAR MÍDIAS</Text>

        {/* Adicionar mídias */}
        <TouchableOpacity style={styles.uploadBox}>
          <Text style={styles.uploadText}>Adicionar mídias</Text>
          <Icon name="upload" size={32} color="#002D62" style={{ marginTop: 10 }} />
        </TouchableOpacity>

        {/* Postagens */}
        <Text style={styles.subTitle}>POSTAGENS</Text>

        {/* Barra de pesquisa */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#002D62" style={{ marginHorizontal: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar..."
            placeholderTextColor="#002D62"
            value={searchText}
            onChangeText={setSearchText}
          />
          <Icon name="filter" size={20} color="#002D62" style={{ marginHorizontal: 8 }} />
        </View>

        {/* Botões de postagens */}
        <View style={styles.postsContainer}>
          {filteredCategories.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.postButton}
              >
                <Text style={styles.postButtonText}>{item.categoria}</Text>
              </TouchableOpacity>
          ))}
          {loading && <Text style={styles.uploadText}>Carregando categorias...</Text>}
          {!loading && !!errorMessage && <Text style={styles.uploadText}>{errorMessage}</Text>}
          {!loading && !errorMessage && categories.length === 0 && (
            <Text style={styles.uploadText}>Nenhuma categoria cadastrada.</Text>
          )}
        </View>
      </ScrollView>

      {/* NavBar */}
      <NavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#002D62",
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  scroll: {
    alignItems: "center",
    paddingBottom: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#002D62",
    marginTop: 20,
  },
  uploadBox: {
    width: "90%",
    borderWidth: 1,
    borderColor: "#002D62",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 25,
    marginVertical: 20,
  },
  uploadText: {
    fontSize: 16,
    color: "#002D62",
    fontWeight: "bold",
  },
  subTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#002D62",
    alignSelf: "flex-start",
    marginLeft: "5%",
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#002D62",
    borderRadius: 8,
    width: "90%",
    height: 45,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: "#002D62",
    fontSize: 16,
  },
  postsContainer: {
    width: "90%",
    alignItems: "center",
  },
  postButton: {
    width: "100%",
    backgroundColor: "#003580",
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },
  postButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
