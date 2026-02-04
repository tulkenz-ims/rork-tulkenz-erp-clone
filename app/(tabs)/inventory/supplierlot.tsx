import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Truck } from 'lucide-react-native';

export default function SupplierLotScreen() {
  return (
    <InventoryPlaceholder
      title="Supplier Lot Tracking"
      description="Track vendor lot numbers alongside internal lot numbers"
      icon={Truck}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Vendor Lots', description: 'Record vendor lot numbers' },
        { title: 'Lot Mapping', description: 'Map vendor to internal lots' },
        { title: 'Vendor Trace', description: 'Trace back to vendor lots' },
        { title: 'Lot Reports', description: 'Report on vendor lots' },
      ]}
    />
  );
}
