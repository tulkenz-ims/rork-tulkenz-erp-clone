import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { RefreshCw } from 'lucide-react-native';

export default function ContractRenewalScreen() {
  return (
    <ProcurementPlaceholder
      title="Contract Renewals"
      description="Manage contract expiration and renewal processes"
      icon={RefreshCw}
      color="#F59E0B"
      category="Contract Management"
      features={[
        { title: 'Expiration Alerts', description: 'Get notified before contracts expire' },
        { title: 'Renewal Calendar', description: 'View upcoming renewals on calendar' },
        { title: 'Auto-Renewal Tracking', description: 'Track auto-renewing contracts' },
        { title: 'Renewal Negotiation', description: 'Manage renewal negotiations' },
        { title: 'Amendment Processing', description: 'Process contract amendments' },
      ]}
    />
  );
}
