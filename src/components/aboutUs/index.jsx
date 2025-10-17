import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function AboutUs() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SOBRE NÓS</Text>
      <View style={styles.content}>
        <Text style={styles.description}>
          Fundada em 2013, nós temos o objetivo de passar nossos valores e princípios, 
          ganhando almas para o reino de Jesus. Além de ajudar o próximo"
        </Text>
        <Image
          source={require('../../../assets/img/sobre_nos.png')} 
          style={styles.image}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#001F3D',
    padding: 20,
    width: '100%',
    marginTop: 30
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 15,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    color: '#fff',
    flex: 1,
    fontSize: 16,
    marginRight: 38,
    textAlign: 'justify',
    marginLeft: 10
  },
  image: {
    width: 132,
    height: 132,
    borderRadius: 10,
  },
});
