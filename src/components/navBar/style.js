import styled from 'styled-components/native';
import { TouchableOpacity } from 'react-native';

export const Container = styled.View`
  background-color: #001F3D;
  height: 70px;
  width: 100%;
  position: absolute;
  bottom: 0;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

export const NavButton = styled(TouchableOpacity)`
  align-items: center;
  justify-content: center;
  margin: 0 15px;
`;

export const Icon = styled.Image`
  width: 28px;
  height: 28px;
  margin-bottom: 2px;
`;

export const Title = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
`;
