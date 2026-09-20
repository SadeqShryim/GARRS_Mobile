import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="garage" />
      <Tabs.Screen name="recalls" />
      <Tabs.Screen name="service" />
      <Tabs.Screen name="hub" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
