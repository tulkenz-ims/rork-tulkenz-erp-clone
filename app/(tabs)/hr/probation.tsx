import { CheckSquare } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function ProbationScreen() {
  return (
    <HRPlaceholder
      title="Probation Tracking"
      description="Monitor probationary periods with 30/60/90 day check-ins and milestone tracking."
      icon={CheckSquare}
      color="#064E3B"
      category="Onboarding"
      features={[
        { title: 'Probation Periods', description: 'Configure probation duration' },
        { title: '30/60/90 Check-ins', description: 'Scheduled milestone reviews' },
        { title: 'Manager Feedback', description: 'Probation evaluation forms' },
        { title: 'Extension Workflow', description: 'Probation extension requests' },
        { title: 'Completion Tracking', description: 'Monitor probation status' },
      ]}
    />
  );
}
