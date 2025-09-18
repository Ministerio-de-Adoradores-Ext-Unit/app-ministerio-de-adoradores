import { NavigationContainer } from '@react-navigation/native';
import { useFonts, LeagueSpartan_500Medium, LeagueSpartan_400Regular, LeagueSpartan_700Bold } from '@expo-google-fonts/league-spartan';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import StackN from './src/Navigation/StackN';

// Impede o splash de sumir automaticamente
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    LeagueSpartan_500Medium,
    LeagueSpartan_400Regular,
    LeagueSpartan_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync(); // Esconde o splash quando estiver pronto
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // ou um placeholder de loading
  }

  return (
    <NavigationContainer onReady={onLayoutRootView}>
      <StackN />
    </NavigationContainer>
  );
}
