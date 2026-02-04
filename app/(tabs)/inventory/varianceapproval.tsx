import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { CheckSquare } from 'lucide-react-native';

export default function VarianceApprovalScreen() {
  return (
    <InventoryPlaceholder
      title="Variance Approval"
      description="Approve count variances before adjustment"
      icon={CheckSquare}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Approval Workflow', description: 'Configure approval rules' },
        { title: 'Threshold Rules', description: 'Set approval thresholds' },
        { title: 'Pending Variances', description: 'View pending approvals' },
        { title: 'Approval History', description: 'Track approval decisions' },
      ]}
    />
  );
}
