import { Tabs } from 'expo-router';
import { HumpTabBar } from '../../src/ui/HumpTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <HumpTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="garage" />
      <Tabs.Screen name="recalls" />
      <Tabs.Screen name="service" />
      <Tabs.Screen name="hub" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
