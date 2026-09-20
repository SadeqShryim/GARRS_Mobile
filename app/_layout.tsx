import { Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { BlurTargetView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppBlurTarget } from '../src/overlays/blurTarget';
import { OverlayHost } from '../src/overlays/OverlayHost';
import { color } from '../src/theme/tokens';
import { DotPattern } from '../src/ui/DotPattern';
import { GlassTabBar } from '../src/ui/GlassTabBar';

SplashScreen.preventAutoHideAsync();

// The navigators paint the theme's `background`. On iOS the native stack hands it to the UINavigationController's own view as an
// opaque layer that `contentStyle: transparent` cannot clear — it hid the dot pattern on the iPhone (#F2F2F2 where Android
// showed the dots). The app paints its own surface, so the theme paints nothing.
const THEME = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };

export default function RootLayout() {
  const [loaded] = useFonts({
    Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, GeistMono_400Regular, GeistMono_500Medium,
    InstrumentSerif_400Regular,
    remixicon: require('../src/assets/fonts/remixicon.ttf'),
  });
  const target = useRef<View>(null);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppBlurTarget.Provider value={target}>
          <View style={styles.app}>
            <BlurTargetView ref={target} style={styles.app}>
              <DotPattern />
              <ThemeProvider value={THEME}><Slot /></ThemeProvider>
            </BlurTargetView>
            <GlassTabBar />
            <OverlayHost />
          </View>
          <StatusBar style="dark" />
        </AppBlurTarget.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1 }, app: { flex: 1, backgroundColor: color.surface } });
