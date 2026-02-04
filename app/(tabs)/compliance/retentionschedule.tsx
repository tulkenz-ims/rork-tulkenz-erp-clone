import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Archive } from 'lucide-react-native';

export default function RetentionScheduleScreen() {
  return (
    <CompliancePlaceholder
      title="Record Retention Schedule"
      description="Document record retention requirements and schedules"
      icon={Archive}
      color="#6366F1"
      category="Record Retention & Document Control"
      features={[
        { title: 'Record Categories', description: 'List record types by category' },
        { title: 'Retention Periods', description: 'Document required retention times' },
        { title: 'Legal Requirements', description: 'Track regulatory requirements' },
        { title: 'Storage Location', description: 'Document storage locations' },
        { title: 'Review Schedule', description: 'Track schedule reviews' },
      ]}
    />
  );
}
