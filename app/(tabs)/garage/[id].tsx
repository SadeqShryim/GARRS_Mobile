import { useLocalSearchParams, useRouter } from 'expo-router';
import { VehicleStatsScreen } from '../../../src/screens/VehicleStatsScreen';
import { useAppStore } from '../../../src/store/useAppStore';

export default function StatsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const showRecall = useAppStore((s) => s.showRecall);
  return (
    <VehicleStatsScreen
      id={Number(id)}
      onBack={() => router.back()}
      onRecallDetails={() => { showRecall('v' + id); router.navigate('/(tabs)/recalls'); }}
    />
  );
}
