import React from 'react'
import { Container, Title, ImageIcon} from './style'

export function MenuButton({onPress, imageSource, title}){
    return (
        <Container onPress={onPress}>
                <ImageIcon source={imageSource} resizeMode='contain'/>
                <Title> {title} </Title>
        </Container>
    )} 