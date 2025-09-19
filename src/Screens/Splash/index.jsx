import { Image, StyleSheet } from 'react-native'
import React, { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";

const Splash = () => {
    const navigation = useNavigation();
    useEffect(() => {
        const timer = setTimeout(() => {
            navigation.navigate('Onboard');
        }, 3000);
        return () => clearTimeout(timer);
    }, [navigation]);

    return (
        <LinearGradient
            colors={['#001F3F', '#004080']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={styles.container}
        >
           <Image
                style={styles.image}
                source={require('../../../assets/img/logoImagem.png')}
            />
        </LinearGradient>
    );
};

export default Splash 

const styles = StyleSheet.create({
    container:{
        flex:1, 
        justifyContent:'center',
        alignItems: 'center'
    },
    image:{
        width:484,
        height:615,
        marginBottom:20
    }
});