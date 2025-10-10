import React from "react";
import styled from "styled-components/native";

export default function Header ({title}){
    return (
        <SimpleContainer>
            <Title>{title}</Title>
        </SimpleContainer>
    )
} 

export const SimpleContainer = styled.View`
    background-color: #001F3D;
    position: fixed;
    width: 100%;
    height: 20%;
    padding: 10px;
    align-items: center;
    justify-content: center;
    borderBottom: 10px left;
`;

export const Title = styled.Text`
    color: #ffffff;
    font-size: 22px;
    font-weight: bold;
`;