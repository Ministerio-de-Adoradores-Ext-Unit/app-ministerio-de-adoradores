import React, { useEffect, useRef } from "react";
import { ActivityIndicator } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import useAuthSession from "../hooks/useAuthSession";

export default function withAuthenticatedScreen(Screen) {
  return function AuthenticatedScreen(props) {
    const { user, loading, errorMessage } = useAuthSession();
    const isFocused = useIsFocused();
    const redirected = useRef(false);
    const allowed = !loading && !errorMessage && !!user?.id;

    useEffect(() => {
      if (isFocused && !loading && !allowed && !redirected.current) {
        redirected.current = true;
        // Remove o histórico privado ao perder a sessão, inclusive ao voltar pelo botão físico.
        props.navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    }, [isFocused, loading, allowed, props.navigation]);

    if (loading) {
      return <ActivityIndicator style={{ flex: 1 }} size="large" color="#002D62" accessibilityLabel="Verificando sessão" />;
    }
    return allowed ? <Screen {...props} /> : null;
  };
}
