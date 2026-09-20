// The jest mock of expo-router (jest.setup.ts) adds a segments setter for tests of router-driven components.
import 'expo-router';
declare module 'expo-router' {
  export function __setSegments(segments: string[]): void;
}
