import { TrendingUp } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function PIPScreen() {
  return (
    <HRPlaceholder
      title="Performance Improvement"
      description="Create and track performance improvement plans with milestones and progress monitoring."
      icon={TrendingUp}
      color="#B45309"
      category="Performance Management"
      features={[
        { title: 'PIP Creation', description: 'Define improvement objectives' },
        { title: 'Milestone Tracking', description: 'Monitor progress checkpoints' },
        { title: 'Documentation', description: 'Record meetings and feedback' },
        { title: 'Manager Coaching', description: 'Support resources and guidance' },
        { title: 'Outcome Tracking', description: 'Successful completion or next steps' },
      ]}
    />
  );
}
