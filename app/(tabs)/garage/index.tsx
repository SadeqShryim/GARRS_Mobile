import { useRouter } from 'expo-router';
import { GarageScreen } from '../../../src/screens/GarageScreen';

export default function GarageRoute() {
  const router = useRouter();
  return <GarageScreen onOpenStats={(id) => router.push({ pathname: '/(tabs)/garage/[id]', params: { id: String(id) } })} />;
}
