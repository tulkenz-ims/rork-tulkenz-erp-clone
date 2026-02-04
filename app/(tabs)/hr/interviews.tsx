import { MessageCircle } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function InterviewsScreen() {
  return (
    <HRPlaceholder
      title="Interview Management"
      description="Schedule interviews, collect feedback, and manage the interview process."
      icon={MessageCircle}
      color="#9333EA"
      category="Talent Acquisition"
      features={[
        { title: 'Interview Scheduling', description: 'Calendar integration and booking' },
        { title: 'Feedback Forms', description: 'Structured interviewer feedback' },
        { title: 'Interview Panels', description: 'Coordinate multiple interviewers' },
        { title: 'Video Interviews', description: 'Virtual interview support' },
        { title: 'Scorecards', description: 'Standardized evaluation criteria' },
      ]}
    />
  );
}
