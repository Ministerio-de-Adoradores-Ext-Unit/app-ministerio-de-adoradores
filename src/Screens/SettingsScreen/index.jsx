import React, { useEffect, useRef, useState } from "react";
import {
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
import { changePassword } from "../../services/supabaseSettings";
import showMessage from "../../utils/showMessage";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const handleSalvar = async () => {
    if (sending.current) return;
    sending.current = true;
    setLoading(true);
    try {
      await changePassword({ currentPassword: senhaAtual, newPassword: novaSenha, confirmation: confirmarSenha });
      if (mounted.current) {
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarSenha("");
        showMessage("Sucesso", "Sua senha foi redefinida com sucesso.");
      }
    } catch (error) {
      if (mounted.current) showMessage("Não foi possível alterar a senha", error.message);
    } finally {
      sending.current = false;
      if (mounted.current) setLoading(false);
    }
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
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
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
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
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
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setMostrarConfirmarSenha((prev) => !prev)}>
                <Icon
                  name={mostrarConfirmarSenha ? "eye-off" : "eye"}
                  size={18}
                  color="#002D62"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSalvar}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Salvar senha"
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              <Text style={styles.primaryButtonText}>{loading ? "SALVANDO..." : "SALVAR SENHA"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
