import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";

// O loader deve ser uma função estável (ou memorizada com useCallback).
export default function useScreenData(loader, { authenticated = false, refreshMs = 0 } = {}) {
  const [state, setState] = useState({ loader, data: [], loading: true, errorMessage: "" });

  useFocusEffect(useCallback(() => {
    let active = true;
    let requestId = 0;
    let authTimer;

    const load = async () => {
      const id = ++requestId;
      setState({ loader, data: [], loading: true, errorMessage: "" });
      try {
        const data = await loader();
        if (active && id === requestId) {
          setState({ loader, data, loading: false, errorMessage: "" });
        }
      } catch (error) {
        if (active && id === requestId) {
          setState({ loader, data: [], loading: false,
            errorMessage: error.message || "Não foi possível carregar os dados. Volte à tela para tentar novamente." });
        }
      }
    };

    load();
    const appListener = AppState.addEventListener("change", (status) => {
      if (status === "active") load();
    });
    const authListener = authenticated
      ? supabase.auth.onAuthStateChange((event) => {
          if (event === "INITIAL_SESSION") return;
          // Invalida respostas em trânsito e limpa dados da sessão anterior.
          ++requestId;
          setState({ loader, data: [], loading: true, errorMessage: "" });
          clearTimeout(authTimer);
          // Consultas fora do callback evitam disputar o lock do Auth.
          authTimer = setTimeout(load, 0);
        })
      : null;
    const timer = refreshMs ? setInterval(load, refreshMs) : null;

    return () => {
      active = false;
      ++requestId;
      clearTimeout(authTimer);
      clearInterval(timer);
      appListener.remove();
      authListener?.data.subscription.unsubscribe();
    };
  }, [loader, authenticated, refreshMs]));

  // Uma categoria nova nunca recebe os dados da categoria anterior.
  return state.loader === loader
    ? state
    : { data: [], loading: true, errorMessage: "" };
}
