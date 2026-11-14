import React, { useRef, useState } from "react";
import { View, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchHeader from "../../components/header/searchHeader";
import TitleComponent from "../../components/titles";
import InputComponent from "../../components/inputs";
import ButtonForm from "../../components/button/buttonsForm";
import SocialButtons from "../../components/contactCard/socialButtons";
import NavBar from "../../components/navBar";
import styles from "./style";
import {
  createEventRegistration,
  listEvents,
} from "../../services/supabaseData";
import useScreenData from "../../hooks/useScreenData";
import showMessage from "../../utils/showMessage";

const normalizeSearch = (value) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

const SocialMedia = () => {
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const sending = useRef(false);
  const { data: events, loading: eventsLoading, errorMessage } = useScreenData(listEvents);
  const selectedEventId = events.some((event) => event.id === eventId) ? eventId : "";
  const query = normalizeSearch(search);
  const filteredEvents = events.filter((event) =>
    normalizeSearch(`${event.titulo} ${event.local || ""}`).includes(query),
  );
  const visibleEventId = filteredEvents.some((event) => event.id === selectedEventId) ? selectedEventId : "";
  const handleSearch = (text) => {
    setSearch(text);
    setEventId("");
  };

  const handleSubmit = async () => {
    if (sending.current) return;
    if (eventsLoading || errorMessage || !visibleEventId) {
      showMessage("Selecione um evento", errorMessage
        ? "Não foi possível carregar os eventos. Volte à tela para tentar novamente."
        : "Aguarde o carregamento e selecione um evento disponível.");
      return;
    }
    sending.current = true;
    try {
      setLoading(true);
      await createEventRegistration({
        eventId: selectedEventId,
        nomeCompleto: nome,
        telefone,
        email,
      });
      setNome("");
      setTelefone("");
      setEmail("");
      setEventId("");
      showMessage("Inscrição realizada", "Sua inscrição foi enviada com sucesso.");
    } catch (error) {
      showMessage("Não foi possível realizar a inscrição", error.message);
    } finally {
      setLoading(false);
      sending.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchHeader value={search} onChangeText={handleSearch} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          <TitleComponent title="PARTICIPE" />
          <InputComponent
            placeholder="Nome completo"
            valorInserido={nome}
            setValor={setNome}
          />
          <InputComponent
            placeholder="Celular"
            setValor={setTelefone}
            valorInserido={telefone}
            keyboardType="phone-pad"
            maxLength={15}
            mask="(99) 99999-9999"
          />
          <InputComponent
            placeholder="E-mail"
            setValor={setEmail}
            valorInserido={email}
            keyboardType="email-address"
          />
          <InputComponent
            placeholder={eventsLoading ? "Carregando eventos..." : errorMessage
              ? "Falha ao carregar — volte à tela para tentar novamente"
              : !events.length ? "Nenhum evento disponível"
                : !filteredEvents.length ? "Nenhum evento encontrado" : "Selecione o evento"}
            valorInserido={visibleEventId}
            setValor={setEventId}
            options={filteredEvents.map((event) => ({
              label: `${event.titulo} - ${event.data.split("-").reverse().join("/")}`,
              value: event.id,
            }))}
          />

          <View>
            <ButtonForm
              title={loading ? "ENVIANDO..." : "INSCREVER-SE"}
              onPress={loading || eventsLoading || !!errorMessage || filteredEvents.length === 0
                ? undefined : handleSubmit}
              style={{ width: "50%", marginTop: 20, alignSelf: "center" }}
            />
          </View>
        </View>

        <View style={styles.socialButtons}>
          <Text style={styles.title}>
            INSCREVA-SE E FIQUE POR DENTRO DAS NOVIDADES
          </Text>

          <SocialButtons style={styles.socialButtons} />
        </View>
      </ScrollView>

      <NavBar />
    </SafeAreaView>
  );
};
export default SocialMedia;
