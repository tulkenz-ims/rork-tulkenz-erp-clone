import { Gift } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function CelebrationsScreen() {
  return (
    <HRPlaceholder
      title="Milestones & Celebrations"
      description="Track and celebrate employee birthdays, work anniversaries, and service milestones."
      icon={Gift}
      color="#9D174D"
      category="Employee Engagement"
      features={[
        { title: 'Birthday Calendar', description: 'Upcoming birthdays' },
        { title: 'Work Anniversaries', description: 'Service milestone tracking' },
        { title: 'Automated Notifications', description: 'Reminder alerts' },
        { title: 'Service Awards', description: 'Years of service recognition' },
        { title: 'Team Celebrations', description: 'Group milestone events' },
      ]}
    />
  );
}
