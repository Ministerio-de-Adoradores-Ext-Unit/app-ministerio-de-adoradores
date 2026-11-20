import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import PopUp from "../MidiaScreen/PopUp";
import {
  HOME_CAROUSEL_CATEGORY,
  ensureHomeCarouselCategory,
} from "../../services/supabaseCarousel";
import confirmAction from "../../utils/confirmAction";

export default function CarouselADM() {
  const navigation = useNavigation();
  const [editorState, setEditorState] = useState({ hasPending: false, working: false });
  const [leaving, setLeaving] = useState(false);
  const mounted = useRef(true);
  const confirming = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (leaving) navigation.goBack();
  }, [leaving, navigation]);

  usePreventRemove(!leaving && (editorState.hasPending || editorState.working), async ({ data }) => {
    if (editorState.working || confirming.current) return;
    confirming.current = true;
    try {
      const discard = await confirmAction(
        "Descartar imagens?",
        "As imagens ainda não salvas serão removidas desta seleção.",
        "Descartar",
      );
      if (discard && mounted.current) navigation.dispatch(data.action);
    } finally {
      confirming.current = false;
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <PopUp
        visible
        embedded
        category={HOME_CAROUSEL_CATEGORY}
        title="CARROSSEL"
        description="As fotos publicadas aqui substituem os banners padrão da página inicial enquanto houver fotos. Toque em + para escolher imagens e em Salvar para publicá-las."
        beforeUpload={ensureHomeCarouselCategory}
        onStateChange={setEditorState}
        onClose={() => setLeaving(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
