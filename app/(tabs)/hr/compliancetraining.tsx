import { CheckSquare } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function ComplianceTrainingScreen() {
  return (
    <HRPlaceholder
      title="Compliance Training"
      description="Manage required compliance training assignments and track completion status."
      icon={CheckSquare}
      color="#115E59"
      category="Learning & Development"
      features={[
        { title: 'Required Training', description: 'Mandatory course assignments' },
        { title: 'Due Date Tracking', description: 'Completion deadlines' },
        { title: 'Auto-Assignment', description: 'Role-based training rules' },
        { title: 'Completion Reports', description: 'Compliance status dashboard' },
        { title: 'Escalation Alerts', description: 'Overdue training notifications' },
      ]}
    />
  );
}
