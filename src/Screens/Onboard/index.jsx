import { StyleSheet, Text, Image, TouchableOpacity, Dimensions, SafeAreaView, ScrollView, View} from "react-native";
import React from "react";
import theme from '../../theme/theme';
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

const { width, height } = Dimensions.get('window'); // Pegando a largura e altura da tela

const Onboard = () => {
    const navigation = useNavigation();
    const onPress = () => {
        navigation.navigate('Home');
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <LinearGradient
                    colors={['#001F3F', '#004080']}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 0 }}
                    style={styles.gradientContainer}
                >
                    <Image
                        style={styles.image}
                        source={require('../../../assets/img/logoImagem.png')}
                    />
                    <Text style={styles.text}>MINISTÉRIO DE ADORADORES</Text>

                    <Text style={styles.text3}>Igreja Evangélica Pentecostal</Text>

                    <TouchableOpacity style={styles.button} onPress={onPress}>
                        <Icon name="arrow-right" size={50} color="#001F3D" />
                    </TouchableOpacity>
                </LinearGradient>
            </ScrollView>
        </View>
    );
}

export default Onboard;

const styles = StyleSheet.create({
    gradientContainer: { 
        width:'100%',
        height:'100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#001F3D'
    },
    container: {
        flexGrow: 1, // Para garantir que o conteúdo ocupe toda a altura disponível
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width:'100%', // 80% da largura da tela
        height: '65%', // 50% da altura da tela
       // marginBottom: 30,
       marginTop: -45,
    },
    text: {
        fontSize: width * 0.11, // Tamanho proporcional à largura
        color: 'white',
        fontFamily: theme.FONTS.BOLD,
        marginLeft: '8%',
        marginTop: 5
    },
    text2: {
        fontSize: width * 0.09, // Tamanho proporcional à largura
        color: 'white',
        paddingRight: width * 0.15, // 15% da largura
        marginTop: -15,
        fontFamily: theme.FONTS.BOLD
    },
    text3: {
        fontSize: width * 0.08, // Tamanho proporcional à largura
        color: 'white',
        paddingRight: width * 0.2, // 20% da largura
        marginTop: 10,
        fontFamily: theme.FONTS.MEDIUM, 
        marginLeft: '8%'
    },
    text4: {
        fontSize: width * 0.08, // Tamanho proporcional à largura
        color: 'white',
        paddingRight: width * 0.35, // 35% da largura
        marginTop: -5,
        fontFamily: theme.FONTS.MEDIUM
    },
    button: {
        backgroundColor: '#FFF',
        width: width * 0.18, // 18% da largura da tela
        height: width * 0.18, // Tornar o botão quadrado, 18% da largura
        borderRadius: width * 0.18 / 2, // A metade da largura para fazer o botão redondo
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: height * 0.05, // 5% da altura da tela
        right: width * 0.05, // 5% da largura da tela
    }
});