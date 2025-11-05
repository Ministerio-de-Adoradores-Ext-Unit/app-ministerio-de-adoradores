import React from 'react';
import styled from 'styled-components/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context'; 


export default function AdminHeader() {
    const navigation = useNavigation();

    return (
        <SafeAreaContainer>
            <HeaderContainer>
                <BackButton onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#FFF" />
                </BackButton>
            </HeaderContainer>
        </SafeAreaContainer>
    );
}



const SafeAreaContainer = styled(SafeAreaView)`
    background-color: #002B4F; /* Cor de fundo do cabeçalho */
`;

export const HeaderContainer = styled.View`
    background-color: #002B4F; 
    width: 100%;
    height: 60px; /* Altura fixa para o cabeçalho */
    padding-left: 15px;
    padding-right: 15px;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
`;

export const BackButton = styled.TouchableOpacity`
    padding: 10px;
    margin-left: -10px; 
`;
