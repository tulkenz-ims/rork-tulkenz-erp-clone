import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Users } from 'lucide-react-native';

export default function CustomerOwnedScreen() {
  return (
    <InventoryPlaceholder
      title="Customer-Owned Inventory"
      description="Manage inventory owned by customers"
      icon={Users}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Customer Inventory', description: 'Track customer-owned stock' },
        { title: 'Usage Tracking', description: 'Track usage of customer items' },
        { title: 'Return Management', description: 'Manage customer returns' },
        { title: 'Customer Reports', description: 'Customer inventory reports' },
      ]}
    />
  );
}
