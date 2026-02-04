import { Video } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function ILTScreen() {
  return (
    <HRPlaceholder
      title="Instructor-Led Training"
      description="Schedule and manage classroom and virtual instructor-led training sessions."
      icon={Video}
      color="#134E4A"
      category="Learning & Development"
      features={[
        { title: 'Session Scheduling', description: 'Create and manage classes' },
        { title: 'Room Booking', description: 'Reserve training facilities' },
        { title: 'Instructor Management', description: 'Assign trainers' },
        { title: 'Attendance Tracking', description: 'Record participation' },
        { title: 'Virtual Sessions', description: 'Video conferencing integration' },
      ]}
    />
  );
}
