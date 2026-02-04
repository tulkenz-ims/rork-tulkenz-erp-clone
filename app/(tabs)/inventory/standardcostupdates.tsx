import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { RefreshCw } from 'lucide-react-native';

export default function StandardCostUpdatesScreen() {
  return (
    <InventoryPlaceholder
      title="Standard Cost Updates"
      description="Update standard costs and roll changes"
      icon={RefreshCw}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Cost Updates', description: 'Update standard costs' },
        { title: 'Mass Updates', description: 'Bulk cost updates' },
        { title: 'Cost Roll', description: 'Roll costs through BOM' },
        { title: 'Update History', description: 'Track cost changes' },
      ]}
    />
  );
}
