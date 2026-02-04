import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Users } from 'lucide-react-native';

export default function AntiHarassmentTrainingScreen() {
  return (
    <CompliancePlaceholder
      title="Anti-Harassment Training"
      description="Track harassment prevention training compliance"
      icon={Users}
      color="#EF4444"
      category="Labor / Employment Compliance"
      features={[
        { title: 'Training Records', description: 'Document training completion' },
        { title: 'State Requirements', description: 'Track state-specific requirements' },
        { title: 'Supervisor Training', description: 'Track supervisory training' },
        { title: 'Renewal Dates', description: 'Monitor training renewals' },
        { title: 'Compliance Rate', description: 'Track completion rates' },
      ]}
    />
  );
}
