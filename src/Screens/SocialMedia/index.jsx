import React, { useState } from "react";
import { View, ScrollView, Text, Image, Title } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchHeader from "../../components/header/searchHeader";
import TitleComponent from "../../components/titles";
import InputComponent from "../../components/inputs";
import ButtonForm from "../../components/button/buttonsForm";
import SocialButtons from "../../components/contactCard/socialButtons";
import NavBar from "../../components/navBar";
import styles from "./style";

const SocialMedia = () => {
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [categoria, setCategoria] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      <SearchHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          <TitleComponent title="PARTICIPE" />
          <InputComponent placeholder="Nome completo" />
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
            placeholder="Categoria Desejada"
            valorInserido={categoria}
            setValor={setCategoria}
            options={[
              { label: "Tecnologia", value: "tecnologia" },
              { label: "Design", value: "design" },
              { label: "Marketing", value: "marketing" },
            ]}
          />
          <InputComponent placeholder="Selecione a Data" />

          <View>
            <ButtonForm
              title={"INSCREVER-SE"}
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
