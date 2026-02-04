import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { CheckSquare } from 'lucide-react-native';

export default function ReqApprovalScreen() {
  return (
    <ProcurementPlaceholder
      title="Requisition Approvals"
      description="Multi-tier approval workflow management for purchase requisitions"
      icon={CheckSquare}
      color="#10B981"
      category="Requisitions"
      features={[
        { title: 'Multi-Tier Approvals', description: 'Configure approval chains by amount thresholds' },
        { title: 'Approval Thresholds', description: 'Set spending limits for each approval level' },
        { title: 'Delegation', description: 'Assign backup approvers during absence' },
        { title: 'Approval History', description: 'Track all approval actions and timestamps' },
        { title: 'Notifications', description: 'Automatic alerts for pending approvals' },
      ]}
    />
  );
}
