import React from "react";
import { Container, Title} from "./style";

export default function Header ({title}){
    return (
        <Container>
            <Title>{title}</Title>
        </Container>
    )
} 
