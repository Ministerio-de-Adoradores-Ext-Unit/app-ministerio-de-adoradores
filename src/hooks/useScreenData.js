import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";

export const PUBLIC_CONTENT_REFRESH_MS = 30_000;

const loadingState = (loader) => ({ loader, data: [], loading: true, errorMessage: "" });

// O loader deve ser uma função estável (ou memorizada com useCallback).
export default function useScreenData(loader, {
  authenticated = false, refreshMs = 0, backgroundRefresh = false,
} = {}) {
  const [state, setState] = useState(loadingState(loader));
  const keepData = backgroundRefresh && !authenticated;

  useFocusEffect(useCallback(() => {
    let active = true;
    let foreground = !AppState.currentState || AppState.currentState === "active";
    let requestId = 0;
    let loading = false;
    let authTimer;

    const load = async () => {
      const id = ++requestId;
      loading = true;
      if (keepData) {
        setState((previous) => previous.loader === loader ? previous : loadingState(loader));
      } else {
        setState(loadingState(loader));
      }
      try {
        const data = await loader();
        if (active && id === requestId) {
          setState({ loader, data, loading: false, errorMessage: "" });
        }
      } catch (error) {
        if (active && id === requestId) {
          const failed = { loader, data: [], loading: false,
            errorMessage: error?.message || "Não foi possível carregar os dados. Volte à tela para tentar novamente." };
          if (keepData) {
            setState((previous) => previous.loader === loader && !previous.loading && !previous.errorMessage
              ? previous : failed);
          } else {
            setState(failed);
          }
        }
      } finally {
        if (id === requestId) loading = false;
      }
    };

    if (foreground) load();
    const appListener = AppState.addEventListener("change", (status) => {
      foreground = status === "active";
      if (foreground) load();
    });
    const authListener = authenticated
      ? supabase.auth.onAuthStateChange((event) => {
          if (event === "INITIAL_SESSION") return;
          // Invalida respostas em trânsito e limpa dados da sessão anterior.
          ++requestId;
          setState(loadingState(loader));
          clearTimeout(authTimer);
          // Consultas fora do callback evitam disputar o lock do Auth.
          authTimer = setTimeout(load, 0);
        })
      : null;
    const timer = refreshMs ? setInterval(() => {
      if (active && foreground && !loading) load();
    }, refreshMs) : null;

    return () => {
      active = false;
      ++requestId;
      clearTimeout(authTimer);
      clearInterval(timer);
      appListener.remove();
      authListener?.data.subscription.unsubscribe();
    };
  }, [loader, authenticated, refreshMs, keepData]));

  // Uma categoria nova nunca recebe os dados da categoria anterior.
  return state.loader === loader
    ? state
    : loadingState(loader);
}
