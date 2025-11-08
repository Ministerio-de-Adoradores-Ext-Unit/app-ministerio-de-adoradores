import React from "react";
import { Touchable, TouchableOpacity } from "react-native";
import { Container, Icon, NavButton, Title } from "./style";

export default function NavBar(){
    return (
        <Container> 
            <NavButton>
                <Icon source={require('../../../assets/img/icon_home.png')}/>
                <Title> Home </Title>
            </NavButton>
            <NavButton>
                <Icon source={require('../../../assets/img/icon_profile.png')}/>
                <Title> Perfil </Title>
            </NavButton>
        </Container>
    ) 
}