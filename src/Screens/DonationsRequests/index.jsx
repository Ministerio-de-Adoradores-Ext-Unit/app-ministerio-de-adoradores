import React from "react";
import { SafeAreaView, StyleSheet, ScrollView, View, Image } from "react-native";
import NavBar from "../../components/navBar";
import SearchHeader from "../../components/header/searchHeader";
import InputComponent from "../../components/inputs";

export default function DonationsRequests() {
  return (
    <SafeAreaView style={styles.container}>
      <SearchHeader />

      <ScrollView style={styles.scrollView}>
        <View style={styles.banner}>
          <Image
            source={require("../../../assets/img/banner_doacao_1.png")}
            style={styles.image}
          />
        </View>

        <View style={styles.banner}>
          <Image
            source={require("../../../assets/img/banner_doacao_2.png")}
            style={styles.image}
          />
        </View>

        <InputComponent label='NOME COMPLETO: ' placeholder='Nome completo...' />
        <InputComponent label='INFORMAÇÕES COMPLEMENTARES: ' placeholder='...' />
      </ScrollView>

      <NavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  banner: {
    width: "90%",
    height: 106,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3, 
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginVertical: 10,
    alignSelf: "center",
    overflow: "hidden",
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: "cover",
  },
  scrollView: {
    paddingBottom: "30",
    paddingTop: '5%'
  }
});
