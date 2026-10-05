import React, { useRef, useState } from "react";
import { Alert, ScrollView, View, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NavBar from "../../components/navBar";
import SearchHeader from "../../components/header/searchHeader";
import InputComponent from "../../components/inputs";
import TitleComponent from "../../components/titles";
import ButtonForm from "../../components/button/buttonsForm";
import styles from "./style";
import { createPrayerRequest } from "../../services/supabaseData";

const DonationsRequests = () => {
  const [nome, setNome] = useState("");
  const [pedido, setPedido] = useState("");
  const [loading, setLoading] = useState(false);
  const sending = useRef(false);

  const handleSubmit = async () => {
    if (sending.current) return;
    sending.current = true;
    try {
      setLoading(true);
      await createPrayerRequest({ nome, pedido });
      setNome("");
      setPedido("");
      Alert.alert("Pedido enviado", "Seu pedido de oração foi enviado com sucesso.");
    } catch (error) {
      Alert.alert("Não foi possível enviar", error.message);
    } finally {
      setLoading(false);
      sending.current = false;
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
            valorInserido={nome}
            setValor={setNome}
          />

          <InputComponent
            label="INFORMAÇÕES COMPLEMENTARES:"
            placeholder="Informações..."
            valorInserido={pedido}
            setValor={setPedido}
            multiline
            style={{ height: 139, paddingTop: 10, textAlignVertical: "top" }}
          />

          <ButtonForm
            title={loading ? "ENVIANDO..." : "ENVIAR"}
            onPress={loading ? undefined : handleSubmit}
            style={{ width: "35%", marginTop: 20, alignSelf: "center" }}
          />
        </View>
      </ScrollView>

      <NavBar />
    </SafeAreaView>
  );
};

export default DonationsRequests;
