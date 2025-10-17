import React, { useState } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";

const SearchBar = () => {
  const navigation = useNavigation();
  const onPressLeft = () => {
    navigation.navigate("Home");
  };
  const [query, setQuery] = useState("");

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.iconBackLeft} onPress={onPressLeft}>
        <Icon name="arrow-left" size={25} color="#FFF" />
      </TouchableOpacity>
      <View style={styles.searchSection}>
        <Icon name="search" size={25} color="#000" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Search..."
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#222"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#002347",
    height: 166,
    paddingTop: 35,
    paddingHorizontal: 50,
    borderBottomLeftRadius: 60,
  },
  iconBackLeft: {
    paddingBottom: 15,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    height: 45,
    width: "100%",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: {
    marginRight: 15,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: "#222",
    backgroundColor: "transparent",
  },
});

export default SearchBar;
