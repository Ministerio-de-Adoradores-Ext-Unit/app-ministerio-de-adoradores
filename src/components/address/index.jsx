import React from 'react';
import { View, Text, Linking, StyleSheet, TouchableOpacity } from 'react-native';
import showMessage from '../../utils/showMessage';
import LocationMap from './LocationMap';

const ADDRESS = [
  'Av. Brasil, 755 - Chácaras São Luís',
  'Santana de Parnaíba - SP,',
  '06502-210',
];
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS.join(' '))}`;
// URL de incorporação retornada pelo Google Maps para a busca do endereço.
const EMBED_URL = `https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1s${encodeURIComponent(ADDRESS.join(' '))}`;

export default function Address() {
  const openMap = async () => {
    try {
      await Linking.openURL(MAPS_URL);
    } catch {
      showMessage('Não foi possível abrir o mapa', 'Tente novamente ou procure o endereço no Google Maps.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ENDEREÇO</Text>
      <Text style={styles.address}>
        {ADDRESS.join('\n')}
      </Text>
      <View style={styles.map}>
        <LocationMap url={EMBED_URL} title="Mapa da Avenida Brasil, 755" />
      </View>
      <TouchableOpacity
        style={styles.mapLink}
        onPress={openMap}
        accessibilityRole="link"
        accessibilityLabel="Abrir endereço no Google Maps"
      >
        <Text style={styles.mapLinkText}>Abrir no Google Maps</Text>
      </TouchableOpacity>
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
    maxWidth: 720,
    height: 260,
    borderRadius: 10,
    backgroundColor: '#f0f3f5',
    overflow: 'hidden',
  },
  mapLink: {
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 4,
  },
  mapLinkText: {
    color: '#002D62',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
