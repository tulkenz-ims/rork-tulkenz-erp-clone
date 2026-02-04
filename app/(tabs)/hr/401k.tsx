import { DollarSign } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function Retirement401kScreen() {
  return (
    <HRPlaceholder
      title="401(k) Management"
      description="Manage retirement plan enrollment, contributions, and employer matching."
      icon={DollarSign}
      color="#9F1239"
      category="Benefits Administration"
      features={[
        { title: '401(k) Enrollment', description: 'Retirement plan signup' },
        { title: 'Contribution Elections', description: 'Deferral percentage setup' },
        { title: 'Employer Match', description: 'Match calculation and tracking' },
        { title: 'Vesting Schedules', description: 'Track vesting status' },
        { title: 'Investment Options', description: 'Fund selection support' },
      ]}
    />
  );
}
