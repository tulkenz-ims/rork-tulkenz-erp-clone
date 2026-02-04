import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Building2 } from 'lucide-react-native';

export default function MultiWarehouseScreen() {
  return (
    <InventoryPlaceholder
      title="Multi-Warehouse"
      description="Manage inventory across multiple warehouse facilities"
      icon={Building2}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Warehouse Setup', description: 'Configure multiple warehouses' },
        { title: 'Warehouse Inventory', description: 'Track inventory by warehouse' },
        { title: 'Inter-Warehouse', description: 'Transfer between warehouses' },
        { title: 'Warehouse Reports', description: 'Reports by warehouse' },
      ]}
    />
  );
}
