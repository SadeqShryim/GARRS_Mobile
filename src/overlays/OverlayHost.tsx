// src/overlays/OverlayHost.tsx — every overlay, mounted here in the source's z-order: add/recall sheet (z20), light sheet and
// reason sheet (z24), membership (z25), chat (z26), VIN help (z27), article reader (z28), VIN scanner (z29, Slice 4 — above
// the Add sheet it is opened from), toast (z30), splash (z60).
//
// The scanner is the one overlay that outlives its `screen` flag: `addScannedVehicle` clears `screen` (and the sheet) as it
// appends the vehicle, so the success card is kept on screen by `scan.phase === 'added'` until the card's dwell, Done, or
// hardware back resets the scan (spec §10, §11).
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
import { ScanScreen } from '../screens/scan/ScanScreen';
import { ReasonSheet } from '../screens/service/ReasonSheet';
import { Splash } from '../screens/splash/Splash';
import { Toast } from '../ui/Toast';

export function OverlayHost() {
  const sheet = useAppStore((s) => s.sheet);
  const screen = useAppStore((s) => s.screen);
  const hubLight = useAppStore((s) => s.hubLight);
  const splash = useAppStore((s) => s.splash);
  const scanPhase = useAppStore((s) => s.scan.phase);
  const dismissSplash = useAppStore((s) => s.dismissSplash);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const closeScreen = useAppStore((s) => s.closeScreen);
  const closeArticle = useAppStore((s) => s.closeArticle);
  const closeLight = useAppStore((s) => s.closeLight);
  const resetScan = useAppStore((s) => s.resetScan);
  const router = useRouter();
  const scanOpen = screen === 'scan' || scanPhase === 'added';

  // Android back closes the topmost overlay (screens above the light sheet above the sheets) instead of leaving the app;
  // with nothing open it falls through to the navigator (pops a stats/detail route or exits).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'article') { closeArticle(); return true; }
      if (screen) { closeScreen(); return true; }
      if (scanPhase === 'added') { resetScan(); return true; }   // the success card, still up after the vehicle was added
      if (hubLight) { closeLight(); return true; }
      if (sheet) { closeSheet(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [sheet, screen, hubLight, scanPhase, closeSheet, closeScreen, closeArticle, closeLight, resetScan]);

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
      {scanOpen && <ScanScreen />}
      <Toast />
      {splash && <Splash onDone={dismissSplash} />}
    </View>
  );
}
