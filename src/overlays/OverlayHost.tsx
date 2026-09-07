// src/overlays/OverlayHost.tsx — Four overlays mounted here in z-order: add sheet, recall sheet, VIN help, Toast, Splash.
import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { AddVehicleSheet } from '../screens/AddVehicleSheet';
import { RecallSheet } from '../screens/RecallSheet';
import { VinHelpScreen } from '../screens/VinHelpScreen';
import { SplashStub } from '../screens/SplashStub';
import { Toast } from '../ui/Toast';

export function OverlayHost() {
  const sheet = useAppStore((s) => s.sheet);
  const screen = useAppStore((s) => s.screen);
  const splash = useAppStore((s) => s.splash);
  const dismissSplash = useAppStore((s) => s.dismissSplash);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const closeVinHelp = useAppStore((s) => s.closeVinHelp);
  const router = useRouter();

  // Android back closes the topmost overlay (VIN help sits above the add sheet) instead of leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'vinhelp') { closeVinHelp(); return true; }
      if (sheet) { closeSheet(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [sheet, screen, closeSheet, closeVinHelp]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {sheet === 'add' && <AddVehicleSheet />}
      {sheet === 'recall' && <RecallSheet onDetails={() => router.navigate('/(tabs)/recalls')} />}
      {screen === 'vinhelp' && <VinHelpScreen />}
      <Toast />
      {splash && <SplashStub onDone={dismissSplash} />}
    </View>
  );
}
