import React from "react";
import { ScrollView, View, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NavBar from "../../components/navBar";
import SearchHeader from "../../components/header/searchHeader";
import InputComponent from "../../components/inputs";
import TitleComponent from "../../components/titles";
import ButtonForm from "../../components/button/buttonsForm";
import styles from "./style";

const DonationsRequests = () => {
  return (
    <SafeAreaView style={styles.container}>
      <SearchHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TitleComponent title="DOAÇÕES" />

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

        <View style={styles.formSection}>
          <Text style={[styles.title, { fontSize: 26 }]}>PEDIDOS DE ORAÇÃO</Text>

          <InputComponent
            label="NOME COMPLETO: "
            placeholder="Nome completo..."
          />

          <InputComponent
            label="INFORMAÇÕES COMPLEMENTARES:"
            placeholder="Informações..."
            multiline
            style={{ height: 139, paddingTop: 10, textAlignVertical: "top" }}
          />

          <ButtonForm
            title="ENVIAR"
            onPress={() => {}}
            style={{ width: "35%", marginTop: 20, alignSelf: "center" }}
          />
        </View>
      </ScrollView>

      <NavBar />
    </SafeAreaView>
  );
};

export default DonationsRequests;
