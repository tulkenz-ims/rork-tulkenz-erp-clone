import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { MapPin } from 'lucide-react-native';

export default function MultiLocationScreen() {
  return (
    <InventoryPlaceholder
      title="Multi-Location"
      description="Track inventory at multiple locations within warehouses"
      icon={MapPin}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Location Setup', description: 'Configure storage locations' },
        { title: 'Location Inventory', description: 'Track inventory by location' },
        { title: 'Location Transfers', description: 'Move inventory between locations' },
        { title: 'Location Reports', description: 'Reports by location' },
      ]}
    />
  );
}
