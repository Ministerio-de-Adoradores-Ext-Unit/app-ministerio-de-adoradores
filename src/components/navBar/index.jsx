import React from "react";
import { TouchableOpacity } from "react-native";
import { Container, Icon, NavButton, Title } from "./style";
import { useNavigation } from "@react-navigation/native"; // <-- IMPORTANTE

export default function NavBar() {
  const navigation = useNavigation(); // <-- HOOK DE NAVEGAÇÃO

  return (
    <Container>
      {/* Botão Home */}
      <NavButton
        as={TouchableOpacity}
        onPress={() => navigation.navigate("Home")}
      >
        <Icon source={require("../../../assets/img/icon_home.png")} />
        <Title>Home</Title>
      </NavButton>

      {/* Botão Perfil */}
      <NavButton
        as={TouchableOpacity}
        onPress={() => navigation.navigate("AdminScreen")}
      >
        <Icon source={require("../../../assets/img/icon_profile.png")} />
        <Title>Perfil</Title>
      </NavButton>
    </Container>
  );
}
