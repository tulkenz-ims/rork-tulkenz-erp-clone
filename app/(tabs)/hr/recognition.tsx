import { ThumbsUp } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function RecognitionScreen() {
  return (
    <HRPlaceholder
      title="Recognition & Kudos"
      description="Enable peer-to-peer recognition and celebrate employee achievements."
      icon={ThumbsUp}
      color="#92400E"
      category="Performance Management"
      features={[
        { title: 'Kudos Board', description: 'Public recognition feed' },
        { title: 'Award Categories', description: 'Values-based recognition' },
        { title: 'Points System', description: 'Rewards and incentives' },
        { title: 'Manager Recognition', description: 'Top-down appreciation' },
        { title: 'Recognition Reports', description: 'Track engagement metrics' },
      ]}
    />
  );
}
