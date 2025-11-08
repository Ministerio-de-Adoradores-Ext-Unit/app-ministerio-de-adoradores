import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import NavBar from "../../components/navBar";
import Icon from "react-native-vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";

export default function AdminScreen() {
  const navigation = useNavigation();

  const buttons = [
    { label: "MÍDIA", route: "MidiaScreen" },
    { label: "PARTICIPE", route: "ParticipateScreen" },
    { label: "PEDIDOS DE ORAÇÃO", route: "PrayerRequests" },
    { label: "EVENTOS", route: "EventsScreen" },
    { label: "DOAÇÕES", route: "DonationsRequests" },
    { label: "CONFIGURAÇÕES", route: "SettingsScreen" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBox}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.welcomeText}>BEM-VINDO</Text>
          <Text style={styles.adminText}>ADMINISTRADOR</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {buttons.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.buttonShadow}
            onPress={() => navigation.navigate(item.route)}
          >
            <LinearGradient
              colors={["#00408B", "#001E42"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{item.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <NavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#002D62",
    borderBottomLeftRadius: 40,
    paddingVertical: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTextBox: {
    flexDirection: "column",
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  adminText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
  },
  scroll: {
    alignItems: "center",
    paddingVertical: 30,
    paddingBottom: 100,
  },
  buttonShadow: {
    width: "90%",
    marginVertical: 10,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
