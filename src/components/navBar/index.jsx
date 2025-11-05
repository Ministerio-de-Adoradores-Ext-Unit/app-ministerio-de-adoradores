import React from "react";
import { TouchableOpacity } from "react-native";
import { Container, Icon, NavButton, Title } from "./style"; 

export default function NavBar({ isAdmin = false }) { 
    return (
        <Container>
            
            <NavButton>
                <Icon source={require('../../../assets/img/icon_home.png')}/>
                <Title> Início </Title>
            </NavButton>
            
            {!isAdmin && (
                <NavButton>
                    <Icon source={require('../../../assets/img/icon_profile.png')}/>
                    <Title> Perfil </Title>
                </NavButton>
            )}
            
        </Container>
    )
}