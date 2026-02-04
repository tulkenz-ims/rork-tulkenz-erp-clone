import { Send } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function ReferralsScreen() {
  return (
    <HRPlaceholder
      title="Employee Referrals"
      description="Manage employee referral program with tracking and bonus management."
      icon={Send}
      color="#701A75"
      category="Employee Engagement"
      features={[
        { title: 'Referral Submission', description: 'Submit candidate referrals' },
        { title: 'Referral Tracking', description: 'Monitor referral status' },
        { title: 'Bonus Management', description: 'Referral bonus tracking' },
        { title: 'Program Rules', description: 'Configure eligibility criteria' },
        { title: 'Referral Reports', description: 'Program effectiveness metrics' },
      ]}
    />
  );
}
