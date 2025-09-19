import styled from 'styled-components/native';
import { TouchableOpacity } from 'react-native';

export const Container = styled(TouchableOpacity)`
    flex: 1;
    max-height: 45px;
    min-height: 45px;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    width: 55%;

    background: #001F3D;
`

export const Title = styled.Text`
    color: #ffffff;
    font-size: 16px;
    font-weight: bold;
`

