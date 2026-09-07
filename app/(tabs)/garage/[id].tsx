import { useLocalSearchParams, useRouter } from 'expo-router';
import { VehicleStatsScreen } from '../../../src/screens/VehicleStatsScreen';
import { useAppStore } from '../../../src/store/useAppStore';

export default function StatsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const switchTab = useAppStore((s) => s.switchTab);
  return (
    <VehicleStatsScreen
      id={Number(id)}
      onBack={() => router.back()}
      onRecallDetails={() => { switchTab('recalls'); router.navigate('/(tabs)/recalls'); }}
    />
  );
}