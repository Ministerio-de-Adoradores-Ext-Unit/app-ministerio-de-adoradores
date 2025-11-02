import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";

const ButtonForm = ({ title, onPress, style }) => {
  return (
    
      <TouchableOpacity onPress={onPress} style={[styles.cx_button, style]}>
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  title: {
    color: "#ffffff",
    fontSize: 16,
  },
  cx_button: {
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "55%",
    backgroundColor: "#001F3D",
  },
});

export default ButtonForm;
