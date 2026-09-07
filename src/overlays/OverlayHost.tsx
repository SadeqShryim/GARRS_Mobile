// src/overlays/OverlayHost.tsx — Four overlays mounted here in z-order: add sheet, recall sheet, VIN help, Toast, Splash.
import { StyleSheet, View } from 'react-native';
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
  const router = useRouter();

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
