import { Star } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function Feedback360Screen() {
  return (
    <HRPlaceholder
      title="360-Degree Feedback"
      description="Collect multi-rater feedback from managers, peers, direct reports, and self-assessments."
      icon={Star}
      color="#D97706"
      category="Performance Management"
      features={[
        { title: 'Multi-Rater Surveys', description: 'Collect diverse feedback' },
        { title: 'Peer Selection', description: 'Choose feedback providers' },
        { title: 'Anonymous Feedback', description: 'Confidential responses' },
        { title: 'Competency Ratings', description: 'Skill-based assessments' },
        { title: 'Development Reports', description: 'Consolidated feedback insights' },
      ]}
    />
  );
}
