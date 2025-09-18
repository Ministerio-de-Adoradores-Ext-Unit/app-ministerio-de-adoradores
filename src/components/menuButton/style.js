import styled from 'styled-components/native';
import { TouchableOpacity} from 'react-native';

export const Container = styled(TouchableOpacity)`
    max-height: 115px;
    min-height: 115px;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    width: 115px;
    background: #001F3D;
`

export const Title = styled.Text`
    color: #ffffff;
    font-size: 14px;
    font-weight: bold;
    margin-top:5px;
`
export const ImageIcon = styled.Image` 
    height: 65px;
    width: 65px;
    resize-mode: contain;
`