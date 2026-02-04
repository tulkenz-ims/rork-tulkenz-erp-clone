import { Calendar } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function SchedulingScreen() {
  return (
    <HRPlaceholder
      title="Shift Scheduling"
      description="Create and manage employee work schedules, shift templates, and shift swap requests."
      icon={Calendar}
      color="#3B82F6"
      category="Time & Attendance"
      features={[
        { title: 'Shift Templates', description: 'Reusable schedule patterns' },
        { title: 'Auto-Scheduling', description: 'AI-powered schedule optimization' },
        { title: 'Shift Swaps', description: 'Employee-initiated swap requests' },
        { title: 'Coverage Alerts', description: 'Notifications for understaffing' },
        { title: 'Availability Management', description: 'Track employee availability' },
      ]}
    />
  );
}
