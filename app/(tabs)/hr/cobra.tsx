import { Umbrella } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function COBRAScreen() {
  return (
    <HRPlaceholder
      title="COBRA Administration"
      description="Manage COBRA continuation coverage notifications and enrollment for departing employees."
      icon={Umbrella}
      color="#881337"
      category="Benefits Administration"
      features={[
        { title: 'COBRA Notices', description: 'Generate required notifications' },
        { title: 'Election Tracking', description: 'Monitor enrollment decisions' },
        { title: 'Premium Payments', description: 'Track payment status' },
        { title: 'Coverage Duration', description: 'Manage coverage periods' },
        { title: 'Compliance Calendar', description: 'Deadline tracking' },
      ]}
    />
  );
}
