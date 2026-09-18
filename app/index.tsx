import { Redirect } from 'expo-router';

// The root path. Expo Go on iOS launches the app with an explicit root URL (Android hands the router no path, so
// the tab navigator's default applied there); without an index route that URL matched the router's built-in
// "Unmatched Route" screen. Every launch lands on the Garage tab, the design's first screen.
export default function Index() {
  return <Redirect href="/(tabs)/garage" />;
}
