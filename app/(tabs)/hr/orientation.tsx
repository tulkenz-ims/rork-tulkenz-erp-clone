import { Calendar } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function OrientationScreen() {
  return (
    <HRPlaceholder
      title="Orientation Scheduling"
      description="Schedule and manage new hire orientation sessions and welcome activities."
      icon={Calendar}
      color="#065F46"
      category="Onboarding"
      features={[
        { title: 'Orientation Calendar', description: 'Schedule orientation sessions' },
        { title: 'Session Management', description: 'Track attendance and completion' },
        { title: 'Welcome Materials', description: 'Digital welcome packet' },
        { title: 'Buddy Assignment', description: 'Mentor/buddy matching' },
        { title: 'Day-One Checklist', description: 'First day task list' },
      ]}
    />
  );
}
