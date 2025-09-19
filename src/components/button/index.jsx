import React from 'react'
import { View, Text} from 'react-native'
import { Container, Title} from './style'

export function Button({title, onPress}){
    return (
        <Container onPress={onPress}> 
            <Title> {title} </Title>
        </Container>
    )
}