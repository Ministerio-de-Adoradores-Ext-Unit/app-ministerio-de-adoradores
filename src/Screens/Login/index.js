import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Feather";
import { SafeAreaView } from "react-native-safe-area-context";
import NavBar from "../../components/navBar";
import SimpleHeader from "../../components/header/simpleHeader";

const COLORS = {
  primary: "#002D62",
  secondary: "#2563B8",
  input: "#EEEEEE",
  placeholder: "#8A8F98",
  white: "#FFFFFF",
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [focado, setFocado] = useState(null); // "email" | "senha" | null

  const validar = () => {
    if (!email.trim() || !senha.trim()) {
      Alert.alert("Atenção", "Preencha o e-mail e a senha.");
      return false;
    }
    return true;
  };

  const handleEntrar = () => {
    if (!validar()) return;

    // (Supabase): validar e-mail e senha aqui antes de entrar.
    // Por enquanto só navega para a tela de administrador.
    navigation.navigate("AdminScreen");
  };

  const handleCadastrar = () => {
    if (!validar()) return;
    if (senha.length < 6) {
      Alert.alert("Atenção", "A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    // TODO (Supabase): criar a conta do administrador aqui.
    Alert.alert("Cadastro", "Cadastro ainda não está conectado.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SimpleHeader />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Título */}
          <View style={styles.titleArea}>
            <Text style={styles.title}>LOGIN</Text>
            <View style={styles.titleLine} />
            <Text style={styles.subtitle}>
              Acesse a área administrativa
            </Text>
          </View>

          {/* E-mail */}
          <View
            style={[
              styles.inputBox,
              focado === "email" && styles.inputBoxFocused,
            ]}
          >
            <Icon
              name="mail"
              size={20}
              color={COLORS.primary}
              style={styles.leftIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocado("email")}
              onBlur={() => setFocado(null)}
            />
          </View>

          {/* Senha */}
          <View
            style={[
              styles.inputBox,
              focado === "senha" && styles.inputBoxFocused,
            ]}
          >
            <Icon
              name="lock"
              size={20}
              color={COLORS.primary}
              style={styles.leftIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={COLORS.placeholder}
              secureTextEntry={!mostrarSenha}
              autoCapitalize="none"
              value={senha}
              onChangeText={setSenha}
              onFocus={() => setFocado("senha")}
              onBlur={() => setFocado(null)}
            />
            <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)}>
              <Icon
                name={mostrarSenha ? "eye-off" : "eye"}
                size={20}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Botões */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleEntrar}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>ENTRAR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleCadastrar}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>CADASTRAR</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <NavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 32, // afasta o conteúdo do header
    paddingBottom: 100,
  },
  titleArea: {
    marginTop: 40,
    marginBottom: 44, // espaço grande entre o título e os campos
  },
  title: {
    fontSize: 38,
    lineHeight: 46, // evita cortar o texto
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: 1,
  },
  titleLine: {
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
    marginTop: 8,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.placeholder,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 54,
    backgroundColor: COLORS.input,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  inputBoxFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  leftIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.primary,
  },
  buttons: {
    marginTop: 24,
    gap: 14,
  },
  button: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.secondary,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});