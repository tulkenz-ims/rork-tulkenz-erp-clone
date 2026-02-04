import { RefreshCw } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function RepeatDeficiencyScreen() {
  return (
    <SanitationPlaceholder
      title="Repeat Deficiency Tracking"
      description="Track recurring sanitation deficiencies"
      icon={RefreshCw}
      color="#DC2626"
      category="Non-Conformance & Corrective Action"
      features={[
        { title: 'Deficiency History', description: 'Track repeat issues' },
        { title: 'Frequency', description: 'How often issue recurs' },
        { title: 'Root Cause Analysis', description: 'Deep dive on causes' },
        { title: 'Escalation', description: 'Escalation procedures' },
        { title: 'Resolution Tracking', description: 'Monitor until resolved' },
      ]}
    />
  );
}
