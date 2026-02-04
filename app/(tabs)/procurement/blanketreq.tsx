import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { Layers } from 'lucide-react-native';

export default function BlanketReqScreen() {
  return (
    <ProcurementPlaceholder
      title="Blanket Requisitions"
      description="Create standing requisitions for recurring purchases"
      icon={Layers}
      color="#8B5CF6"
      category="Requisitions"
      features={[
        { title: 'Standing Orders', description: 'Create blanket requisitions for ongoing needs' },
        { title: 'Release Scheduling', description: 'Schedule automatic releases against blanket orders' },
        { title: 'Amount Tracking', description: 'Monitor usage against approved blanket amounts' },
        { title: 'Expiration Alerts', description: 'Notifications before blanket requisition expiry' },
        { title: 'Renewal Management', description: 'Easy renewal of expired blanket requisitions' },
      ]}
    />
  );
}
