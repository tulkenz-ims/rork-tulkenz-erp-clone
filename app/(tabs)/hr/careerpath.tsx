import { Award } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function CareerPathScreen() {
  return (
    <HRPlaceholder
      title="Career Pathing"
      description="Define career paths and development plans to help employees grow within the organization."
      icon={Award}
      color="#451A03"
      category="Performance Management"
      features={[
        { title: 'Career Tracks', description: 'Define progression paths' },
        { title: 'Role Requirements', description: 'Skills for advancement' },
        { title: 'Development Plans', description: 'Individual growth roadmaps' },
        { title: 'Mentorship Matching', description: 'Connect with mentors' },
        { title: 'Internal Mobility', description: 'Lateral move opportunities' },
      ]}
    />
  );
}
