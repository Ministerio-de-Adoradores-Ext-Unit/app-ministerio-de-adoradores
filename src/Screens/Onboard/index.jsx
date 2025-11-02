import React from "react";
import { StyleSheet, Text, Image, TouchableOpacity, Dimensions, ScrollView, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import theme from '../../theme/theme';
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

const { width, height } = Dimensions.get('window'); 

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
        flexGrow: 1, 
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width:'100%', 
        height: '65%', 
       // marginBottom: 30,
       marginTop: -45,
    },
    text: {
        fontSize: width * 0.11, 
        color: 'white',
        fontFamily: theme.FONTS.BOLD,
        marginLeft: '8%',
        marginTop: 5
    },
    text2: {
        fontSize: width * 0.09, 
        color: 'white',
        paddingRight: width * 0.15, 
        marginTop: -15,
        fontFamily: theme.FONTS.BOLD
    },
    text3: {
        fontSize: width * 0.08, 
        color: 'white',
        paddingRight: width * 0.2, 
        marginTop: 10,
        fontFamily: theme.FONTS.MEDIUM, 
        marginLeft: '8%'
    },
    text4: {
        fontSize: width * 0.08, 
        color: 'white',
        paddingRight: width * 0.35, 
        marginTop: -5,
        fontFamily: theme.FONTS.MEDIUM
    },
    button: {
        backgroundColor: '#FFF',
        width: width * 0.18, 
        height: width * 0.18, 
        borderRadius: width * 0.18 / 2, 
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: height * 0.05, 
        right: width * 0.05, 
    }
});