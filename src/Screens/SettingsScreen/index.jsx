import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import styles from "./style";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const handleSalvar = () => {
    if (!senhaAtual.trim() || !novaSenha.trim() || !confirmarSenha.trim()) {
      Alert.alert("Atenção", "Preencha todos os campos para continuar.");
      return;
    }

    if (novaSenha.length < 6) {
      Alert.alert("Atenção", "A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      Alert.alert("Atenção", "A nova senha e a confirmação não coincidem.");
      return;
    }

    Alert.alert("Sucesso", "Sua senha foi redefinida com sucesso.");
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CONFIGURAÇÕES</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>REDEFINIR SENHA</Text>

            <View style={styles.inputWrap}>
              <Icon name="lock" size={18} color="#002D62" style={styles.leftIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha atual"
                placeholderTextColor="#7E8A9A"
                secureTextEntry={!mostrarSenhaAtual}
                value={senhaAtual}
                onChangeText={setSenhaAtual}
              />
              <TouchableOpacity onPress={() => setMostrarSenhaAtual((prev) => !prev)}>
                <Icon
                  name={mostrarSenhaAtual ? "eye-off" : "eye"}
                  size={18}
                  color="#002D62"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrap}>
              <Icon name="key" size={18} color="#002D62" style={styles.leftIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nova senha"
                placeholderTextColor="#7E8A9A"
                secureTextEntry={!mostrarNovaSenha}
                value={novaSenha}
                onChangeText={setNovaSenha}
              />
              <TouchableOpacity onPress={() => setMostrarNovaSenha((prev) => !prev)}>
                <Icon
                  name={mostrarNovaSenha ? "eye-off" : "eye"}
                  size={18}
                  color="#002D62"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrap}>
              <Icon name="check-circle" size={18} color="#002D62" style={styles.leftIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar nova senha"
                placeholderTextColor="#7E8A9A"
                secureTextEntry={!mostrarConfirmarSenha}
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
              />
              <TouchableOpacity onPress={() => setMostrarConfirmarSenha((prev) => !prev)}>
                <Icon
                  name={mostrarConfirmarSenha ? "eye-off" : "eye"}
                  size={18}
                  color="#002D62"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSalvar}>
              <Text style={styles.primaryButtonText}>SALVAR SENHA</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
