import { useLocalSearchParams } from 'expo-router';
import { ChecklistScreen } from '../../src/components/checklist/ChecklistScreen';

export default function PolishSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <ChecklistScreen sessionId={sessionId} />;
}
