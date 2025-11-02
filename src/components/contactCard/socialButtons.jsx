import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from "react-native";
import youtubeImg from "../../../assets/img/youtube.png";
import instagramImg from "../../../assets/img/instagram.png";

const SocialButtons = () => (
  <View style={styles.container}>
    <TouchableOpacity
      style={styles.button}
      onPress={() =>
        Linking.openURL(
          "https://www.youtube.com/@igrejaministeriodeadoradoresx"
        )
      }
    >
      <Image source={youtubeImg} style={styles.icon} />
      <Text style={styles.title}>YOUTUBE (LIVES)</Text>
      <Text style={styles.subtitle}>CLIQUE NO LINK E CONFIRA</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.button}
      onPress={() =>
        Linking.openURL(
          "https://www.instagram.com/_ministerio_de_adoradores_/?igsh=anlybWExaW82bDA1#"
        )
      }
    >
      <Image source={instagramImg} style={styles.icon} />
      <Text style={styles.title}>INSTAGRAM</Text>
      <Text style={styles.subtitle}>CLIQUE NO LINK E CONFIRA</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: '75%',
  },
  button: {
    alignItems: "center",
  },
  icon: {
    width: '35%',
    height: '80%',
    marginBottom: 12,
    borderRadius: 10,
  },
  title: {
    fontWeight: "bold",
    fontSize: 12, 
    textAlign: "center",
  },
  subtitle: {
    fontWeight: "bold",
    fontSize: 8,
    color: "#333",
    textAlign: "center",
  },
});

export default SocialButtons;
