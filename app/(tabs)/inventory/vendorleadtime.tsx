import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Users } from 'lucide-react-native';

export default function VendorLeadTimeScreen() {
  return (
    <InventoryPlaceholder
      title="Lead Time by Vendor"
      description="Track lead times for each vendor supplier"
      icon={Users}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'Vendor Lead Times', description: 'Set lead times per vendor' },
        { title: 'Vendor Performance', description: 'Track on-time delivery' },
        { title: 'Vendor Comparison', description: 'Compare vendor lead times' },
        { title: 'Vendor Reports', description: 'Vendor lead time reports' },
      ]}
    />
  );
}
