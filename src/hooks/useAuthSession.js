import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { getAuthenticatedUser } from "../services/supabaseAuth";

export default function useAuthSession() {
  const [state, setState] = useState({ user: null, loading: true, errorMessage: "" });
  const verifiedUser = useRef(null);

  useEffect(() => {
    let active = true;
    let revision = 0;
    let authTimer;

    const verify = async () => {
      const request = ++revision;
      if (!verifiedUser.current) {
        setState({ user: null, loading: true, errorMessage: "" });
      }
      try {
        const user = await getAuthenticatedUser();
        if (active && request === revision) {
          verifiedUser.current = user;
          setState({ user, loading: false, errorMessage: "" });
        }
      } catch (error) {
        if (active && request === revision) {
          verifiedUser.current = null;
          setState({ user: null, loading: false, errorMessage: error.message });
        }
      }
    };

    verify();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      ++revision;
      if (event === "SIGNED_OUT" || !session?.user?.id || session.user.id !== verifiedUser.current?.id) {
        verifiedUser.current = null;
        setState({ user: null, loading: true, errorMessage: "" });
      }
      clearTimeout(authTimer);
      // Não consulta o Auth dentro do callback, evitando disputar o lock do SDK.
      authTimer = setTimeout(verify, 0);
    });
    const appListener = AppState.addEventListener("change", (status) => {
      // Revalida sem desmontar formulários de uma sessão já confirmada.
      if (status === "active") verify();
    });

    return () => {
      active = false;
      ++revision;
      clearTimeout(authTimer);
      subscription.unsubscribe();
      appListener.remove();
    };
  }, []);

  return state;
}
