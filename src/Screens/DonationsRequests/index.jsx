import React, { useRef, useState } from "react";
import { ScrollView, View, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NavBar from "../../components/navBar";
import SearchHeader from "../../components/header/searchHeader";
import InputComponent from "../../components/inputs";
import TitleComponent from "../../components/titles";
import ButtonForm from "../../components/button/buttonsForm";
import styles from "./style";
import { createPrayerRequest } from "../../services/supabaseData";
import { listDonationCampaigns } from "../../services/supabaseDonations";
import useScreenData, { PUBLIC_CONTENT_REFRESH_MS } from "../../hooks/useScreenData";
import showMessage from "../../utils/showMessage";
import { getDonationCampaignSource } from "../DonationADM/data";

const normalizeSearch = (value) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

const DonationsRequests = () => {
  const { data: campaigns, loading: campaignsLoading, errorMessage: campaignsError } = useScreenData(listDonationCampaigns, {
    refreshMs: PUBLIC_CONTENT_REFRESH_MS,
    backgroundRefresh: true,
  });
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [pedido, setPedido] = useState("");
  const [loading, setLoading] = useState(false);
  const sending = useRef(false);
  const query = normalizeSearch(search);
  const filteredCampaigns = campaigns.filter((campaign) =>
    normalizeSearch(`${campaign.title || ""} ${campaign.subtitle || ""} ${campaign.description || ""}`).includes(query),
  );

  const handleSubmit = async () => {
    if (sending.current) return;
    sending.current = true;
    try {
      setLoading(true);
      await createPrayerRequest({ nome, pedido });
      setNome("");
      setPedido("");
      showMessage(
        "Pedido enviado",
        "Seu pedido de oração foi enviado com sucesso.",
      );
    } catch (error) {
      showMessage("Não foi possível enviar", error.message);
    } finally {
      setLoading(false);
      sending.current = false;
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
        <TitleComponent title="DOAÇÕES" />

        {filteredCampaigns.map((campaign) => {
          const source = getDonationCampaignSource(campaign);
          return (
            <View key={campaign.id} style={styles.banner}>
              {source ? <Image source={source} style={styles.image} accessibilityLabel={campaign.title} />
                : <Text>Imagem da campanha indisponível.</Text>}
            </View>
          );
        })}
        {(campaignsLoading || campaignsError || filteredCampaigns.length === 0) && (
          <View style={styles.formSection}>
            <Text accessibilityLiveRegion="polite">
              {campaignsLoading ? "Carregando campanhas..." : campaignsError
                || (query && campaigns.length ? "Nenhuma campanha encontrada." : "Nenhuma campanha disponível.")}
            </Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={[styles.title, { fontSize: 26 }]}>
            PEDIDOS DE ORAÇÃO
          </Text>

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
