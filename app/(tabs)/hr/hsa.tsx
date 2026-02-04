import { PiggyBank } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function HSAScreen() {
  return (
    <HRPlaceholder
      title="HSA / FSA Administration"
      description="Manage Health Savings Accounts and Flexible Spending Account enrollments."
      icon={PiggyBank}
      color="#BE123C"
      category="Benefits Administration"
      features={[
        { title: 'HSA Enrollment', description: 'Health savings account setup' },
        { title: 'FSA Elections', description: 'Flexible spending elections' },
        { title: 'Contribution Limits', description: 'IRS limit tracking' },
        { title: 'Balance Tracking', description: 'Account balance visibility' },
        { title: 'Employer Contributions', description: 'Company HSA contributions' },
      ]}
    />
  );
}
