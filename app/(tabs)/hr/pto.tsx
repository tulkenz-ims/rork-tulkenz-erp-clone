import { CalendarDays } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function PTOScreen() {
  return (
    <HRPlaceholder
      title="PTO / Leave Requests"
      description="Manage time off requests, approvals, and leave balances for all employees."
      icon={CalendarDays}
      color="#10B981"
      category="Time & Attendance"
      features={[
        { title: 'Leave Requests', description: 'Submit and track time off requests' },
        { title: 'Approval Workflow', description: 'Multi-level approval routing' },
        { title: 'Leave Calendar', description: 'Team availability view' },
        { title: 'Balance Tracking', description: 'Real-time leave balance updates' },
        { title: 'Blackout Dates', description: 'Restrict requests during peak times' },
      ]}
    />
  );
}
