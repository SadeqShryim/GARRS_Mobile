import { useLocalSearchParams, useRouter } from 'expo-router';
import { RecallDetailScreen } from '../../../src/screens/recalls/RecallDetailScreen';

export default function RecallDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <RecallDetailScreen id={String(id)} onBack={() => router.back()} />;
}
