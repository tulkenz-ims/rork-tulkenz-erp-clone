import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Unlock } from 'lucide-react-native';

export default function PeriodLockScreen() {
  return (
    <FinancePlaceholder
      title="Period Lock"
      description="Lock and unlock accounting periods to control posting."
      icon={Unlock}
      color="#818CF8"
      category="Period Close"
      features={[
        { title: 'Period Status', description: 'View open/closed period status' },
        { title: 'Lock Period', description: 'Close periods to prevent posting' },
        { title: 'Unlock Period', description: 'Reopen periods for adjustments' },
        { title: 'Module Control', description: 'Lock by module (AP, AR, GL)' },
        { title: 'User Exceptions', description: 'Allow specific users to post' },
        { title: 'Audit Trail', description: 'Track period status changes' },
      ]}
    />
  );
}
