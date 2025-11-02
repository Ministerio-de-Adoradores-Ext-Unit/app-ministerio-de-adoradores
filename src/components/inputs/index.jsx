import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList } from "react-native";
import { MaskedTextInput } from "react-native-mask-text";
import { Ionicons } from "@expo/vector-icons";
import styles from "./style";

const InputComponent = ({label, placeholder, style, multiline, setValor, valorInserido, keyboardType, maxLength, mask, options}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (item) => {
    setValor(item.value);
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {options ? (
        <>
          <TouchableOpacity
            style={[styles.input, styles.inputShadow, style, styles.selectBox]}
            activeOpacity={0.7}
            onPress={() => setOpen(true)}
          >
            <Text style={[styles.text, !valorInserido && { color: "#7A7A7A" }]}>
              {valorInserido
                ? options.find((opt) => opt.value === valorInserido)?.label
                : placeholder}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#000" />
          </TouchableOpacity>

          <Modal
            transparent
            visible={open}
            animationType="fade"
            onRequestClose={() => setOpen(false)}
          >
            <TouchableOpacity
              style={styles.overlay}
              activeOpacity={1}
              onPressOut={() => setOpen(false)}
            >
              <View style={styles.modalContent}>
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.option}
                      onPress={() => handleSelect(item)}
                    >
                      <Text style={styles.optionText}>{item.label}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      ) : mask ? (
        <MaskedTextInput
          style={[styles.input, styles.inputShadow, style]}
          value={valorInserido}
          onChangeText={setValor}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          mask={mask}
        />
      ) : (
        <TextInput
          style={[styles.input, styles.inputShadow, style]}
          value={valorInserido}
          onChangeText={setValor}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
        />
      )}
    </View>
  );
};

export default InputComponent;
