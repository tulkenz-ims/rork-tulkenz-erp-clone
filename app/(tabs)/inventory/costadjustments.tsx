import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Edit3 } from 'lucide-react-native';

export default function CostAdjustmentsScreen() {
  return (
    <InventoryPlaceholder
      title="Cost Adjustments"
      description="Make adjustments to inventory costs"
      icon={Edit3}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Cost Adjustments', description: 'Adjust item costs' },
        { title: 'Adjustment Reasons', description: 'Track adjustment reasons' },
        { title: 'Approval Workflow', description: 'Require cost change approval' },
        { title: 'Adjustment History', description: 'Track all adjustments' },
      ]}
    />
  );
}
