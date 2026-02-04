import QualityPlaceholder from '@/components/QualityPlaceholder';
import { AlertTriangle } from 'lucide-react-native';

export default function MockRecallExerciseScreen() {
  return (
    <QualityPlaceholder
      title="Mock Recall Exercise Form"
      description="Document mock recall exercise and results"
      icon={AlertTriangle}
      color="#F59E0B"
      category="Traceability"
      features={[
        { title: 'Exercise Details', description: 'Date, scope, participants' },
        { title: 'Scenario', description: 'Recall scenario description' },
        { title: 'Traceability Test', description: 'Forward and backward trace' },
        { title: 'Time Metrics', description: 'Time to complete each step' },
        { title: 'Effectiveness', description: 'Percentage accounted for' },
        { title: 'Improvement Actions', description: 'Identified improvements' },
      ]}
    />
  );
}
