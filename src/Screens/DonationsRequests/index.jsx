import React from "react";
import { SafeAreaView, StyleSheet, ScrollView } from "react-native";
import NavBar from "../../components/navBar";
import SearchHeader from "../../components/header/searchHeader";

export default function DonationsRequests() {
  return (
    <SafeAreaView style={styles.container}>
      <SearchHeader />

      <ScrollView style={styles.scrollView}></ScrollView>

      <NavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    paddingBottom: "10px",
  },
});
