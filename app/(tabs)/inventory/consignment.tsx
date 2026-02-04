import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Warehouse } from 'lucide-react-native';

export default function ConsignmentScreen() {
  return (
    <InventoryPlaceholder
      title="Consignment Inventory"
      description="Manage vendor-owned consignment inventory"
      icon={Warehouse}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Consignment Setup', description: 'Configure consignment agreements' },
        { title: 'Vendor Inventory', description: 'Track vendor-owned stock' },
        { title: 'Consignment Reports', description: 'Consignment inventory reports' },
        { title: 'Settlement Process', description: 'Process consignment settlements' },
      ]}
    />
  );
}
