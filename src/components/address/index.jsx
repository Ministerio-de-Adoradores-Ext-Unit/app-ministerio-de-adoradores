import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function Address() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ENDEREÇO</Text>
      <Text style={styles.address}>
        Av. Brasil, 755 - Chácaras São Luís{"\n"}
        Santana de Parnaíba - SP,{"\n"}
        06502-210
      </Text>
      <Image
        source={require('../../../assets/img/endereco.png')}
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    marginBottom: 80,
    marginTop: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  address: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  map: {
    width: '90%',
    height: 150,
    borderRadius: 10,
  },
});
