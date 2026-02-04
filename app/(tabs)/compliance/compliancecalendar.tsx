import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Calendar } from 'lucide-react-native';

export default function ComplianceCalendarScreen() {
  return (
    <CompliancePlaceholder
      title="Compliance Calendar"
      description="Track compliance due dates and deadlines"
      icon={Calendar}
      color="#10B981"
      category="Record Retention & Document Control"
      features={[
        { title: 'Due Dates', description: 'List all compliance deadlines' },
        { title: 'Recurring Items', description: 'Track recurring requirements' },
        { title: 'Reminders', description: 'Set compliance reminders' },
        { title: 'Responsible Party', description: 'Assign accountability' },
        { title: 'Completion Status', description: 'Track completion status' },
      ]}
    />
  );
}
