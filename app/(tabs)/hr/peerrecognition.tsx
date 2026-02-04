import { ThumbsUp } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function PeerRecognitionScreen() {
  return (
    <HRPlaceholder
      title="Peer Recognition"
      description="Enable employees to recognize and appreciate their colleagues' contributions."
      icon={ThumbsUp}
      color="#831843"
      category="Employee Engagement"
      features={[
        { title: 'Give Recognition', description: 'Send kudos to colleagues' },
        { title: 'Recognition Feed', description: 'Public appreciation wall' },
        { title: 'Core Values', description: 'Align with company values' },
        { title: 'Points & Rewards', description: 'Gamification elements' },
        { title: 'Leaderboards', description: 'Top recognizers and recipients' },
      ]}
    />
  );
}
