import { Lightbulb } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function SuggestionsScreen() {
  return (
    <HRPlaceholder
      title="Suggestion Box"
      description="Collect anonymous employee feedback, ideas, and suggestions for improvement."
      icon={Lightbulb}
      color="#86198F"
      category="Employee Engagement"
      features={[
        { title: 'Anonymous Submissions', description: 'Confidential feedback' },
        { title: 'Idea Categories', description: 'Organize by topic' },
        { title: 'Voting', description: 'Upvote popular ideas' },
        { title: 'Status Updates', description: 'Track implementation progress' },
        { title: 'Response Management', description: 'HR can respond publicly' },
      ]}
    />
  );
}
