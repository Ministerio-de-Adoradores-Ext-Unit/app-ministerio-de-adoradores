import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from "react-native";
import youtubeImg from "../../../assets/img/youtube.png";
import instagramImg from "../../../assets/img/instagram.png";

const SocialButtons = () => (
  <View style={styles.container}>
    <TouchableOpacity
      style={styles.button}
      onPress={() => Linking.openURL("https://www.youtube.com/@igrejaministeriodeadoradoresx")}
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
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 30,
  },
  button: {
    alignItems: "center",
    width: '35%',
  },
  icon: {
    width: 60,
    height: 60,
    resizeMode: "contain",
    marginBottom: 8,
  },
  title: {
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
    color: "#001F3D",
  },
  subtitle: {
    fontWeight: "bold",
    fontSize: 9,
    color: "#333",
    textAlign: "center",
  },
});

export default SocialButtons;
