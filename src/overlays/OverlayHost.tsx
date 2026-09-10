// src/overlays/OverlayHost.tsx — every overlay, mounted here in the source's z-order: add/recall sheet (z20), light sheet and
// reason sheet (z24), membership (z25), chat (z26), VIN help (z27), article reader (z28), toast (z30), splash (z60).
import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { AddVehicleSheet } from '../screens/AddVehicleSheet';
import { RecallSheet } from '../screens/RecallSheet';
import { VinHelpScreen } from '../screens/VinHelpScreen';
import { ArticleReader } from '../screens/hub/ArticleReader';
import { LightSheet } from '../screens/hub/LightSheet';
import { ChatScreen } from '../screens/profile/ChatScreen';
import { MembershipScreen } from '../screens/profile/MembershipScreen';
import { ReasonSheet } from '../screens/service/ReasonSheet';
import { Splash } from '../screens/splash/Splash';
import { Toast } from '../ui/Toast';

export function OverlayHost() {
  const sheet = useAppStore((s) => s.sheet);
  const screen = useAppStore((s) => s.screen);
  const hubLight = useAppStore((s) => s.hubLight);
  const splash = useAppStore((s) => s.splash);
  const dismissSplash = useAppStore((s) => s.dismissSplash);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const closeScreen = useAppStore((s) => s.closeScreen);
  const closeArticle = useAppStore((s) => s.closeArticle);
  const closeLight = useAppStore((s) => s.closeLight);
  const router = useRouter();

  // Android back closes the topmost overlay (screens above the light sheet above the sheets) instead of leaving the app;
  // with nothing open it falls through to the navigator (pops a stats/detail route or exits).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'article') { closeArticle(); return true; }
      if (screen) { closeScreen(); return true; }
      if (hubLight) { closeLight(); return true; }
      if (sheet) { closeSheet(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [sheet, screen, hubLight, closeSheet, closeScreen, closeArticle, closeLight]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {sheet === 'add' && <AddVehicleSheet />}
      {sheet === 'recall' && <RecallSheet onDetails={() => router.navigate('/(tabs)/recalls')} />}
      {hubLight && <LightSheet />}
      {sheet === 'reason' && <ReasonSheet />}
      {screen === 'membership' && <MembershipScreen />}
      {screen === 'chat' && <ChatScreen />}
      {screen === 'vinhelp' && <VinHelpScreen />}
      {screen === 'article' && <ArticleReader />}
      <Toast />
      {splash && <Splash onDone={dismissSplash} />}
    </View>
  );
}
