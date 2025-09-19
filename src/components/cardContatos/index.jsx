import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ContactCard = () => {
  const openWhatsApp = () => {
    Linking.openURL('https://wa.me/5511999990000');
  };

  const openEmail = () => {
    Linking.openURL('mailto:igrejaministeriodeadoradorex@gmail.com');
  };

  return (
    <LinearGradient
      colors={['#001B33', '#003366']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
        <View style={styles.textContainer}>
          <Text style={styles.title}>VOCÊ ESTÁ PRONTO PARA ABRIR SEU CORAÇÃO A JESUS?</Text>
          <Text style={styles.subtitle}>
            NÓS ESTAMOS AQUI PARA TE OUVIR E APOIAR NESSA DECISÃO TRANSFORMADORA.
          </Text>
          <Text style={styles.subtitle2}>
            ENTRE EM CONTATO CONOSCO!
          </Text>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.buttonTel} onPress={openWhatsApp}>
              <Text style={styles.buttonText}>📞 +55 (11) 99999-0000</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonEmail} onPress={openEmail}>
              <Text style={styles.buttonText}>✉️ igrejaministeriodeadoradorex@gmail.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Image
          source={require('../../../assets/img/jesus.png')}
          style={styles.image}
          resizeMode="contain"
        />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    flexDirection: 'row',
    padding: 16,
    paddingRight: 0, 
    margin: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    width: '90%'
  },
  textContainer: {
    flex: 1,
    maxWidth: SCREEN_WIDTH * 100,
    marginRight:15
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 8,
    width: 215,
  },
  subtitle: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 12,
    width: 185,
    textAlign: 'justify'
  },
    subtitle2: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 12,
    width: 190,
  },
  buttonsRow: {
    gap: 8,
  },
  buttonTel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 4,
    width: SCREEN_WIDTH * 0.40,
  },
  buttonEmail: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 4,
    width: SCREEN_WIDTH * 0.70,
  },
  buttonText: {
    color: '#000',
    fontSize: 10,
  },
  image: {
    position: 'absolute',
    right: -4,
    top: -35,
    width: 150,
    height: 250,
    zIndex: 10, 
  },
});

export default ContactCard;
