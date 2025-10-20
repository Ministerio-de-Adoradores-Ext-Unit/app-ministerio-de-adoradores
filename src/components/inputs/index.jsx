import React, { useState } from "react";
import { TextInput, View, Text, StyleSheet } from "react-native";

export default function InputComponent({ label, placeholder }) {
  const [valorInserido, setValor] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={valorInserido}
        onChangeText={setValor}
        placeholder={placeholder}
        placeholderTextColor="#999"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 5,
    marginHorizontal: '12%',
  },
  input: {
    height: 40,
    width: '80%',
    backgroundColor: "#eee",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginHorizontal: '10%',
    fontSize: 14,
    color: "#333",
  },
});
