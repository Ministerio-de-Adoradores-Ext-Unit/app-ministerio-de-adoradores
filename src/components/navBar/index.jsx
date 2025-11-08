import React from "react";
import { useNavigation } from "@react-navigation/native"; 
import { Touchable, TouchableOpacity } from "react-native";
import { Container, Icon, NavButton, Title } from "./style";

export default function NavBar() {
  const navigation = useNavigation(); 

  return (
    <Container>
      <NavButton onPress={() => navigation.navigate("Home")}>
        <Icon source={require("../../../assets/img/icon_home.png")} />
        <Title>Home</Title>
      </NavButton>

      <NavButton onPress={() => navigation.navigate("AdminScreen")}>
        <Icon source={require("../../../assets/img/icon_profile.png")} />
        <Title>Perfil</Title>
      </NavButton>
    </Container>
  );
}