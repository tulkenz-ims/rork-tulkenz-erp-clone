import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Building2 } from 'lucide-react-native';

export default function WarehouseTransfersScreen() {
  return (
    <InventoryPlaceholder
      title="Warehouse Transfers"
      description="Transfer inventory between warehouse facilities"
      icon={Building2}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Inter-Warehouse', description: 'Transfer between warehouses' },
        { title: 'Ship/Receive', description: 'Ship and receive transfers' },
        { title: 'Transit Tracking', description: 'Track in-transit inventory' },
        { title: 'Transfer Reports', description: 'Warehouse transfer reports' },
      ]}
    />
  );
}
