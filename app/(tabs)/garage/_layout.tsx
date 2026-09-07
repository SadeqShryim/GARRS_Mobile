import { Stack } from 'expo-router';
export default function GarageStack() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />;
}
