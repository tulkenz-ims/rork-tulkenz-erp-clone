import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Layers } from 'lucide-react-native';

export default function ValueByCategoryScreen() {
  return (
    <InventoryPlaceholder
      title="Value by Category"
      description="View inventory value breakdown by category"
      icon={Layers}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Category Values', description: 'Value by item category' },
        { title: 'Category Charts', description: 'Visual category breakdown' },
        { title: 'Category Trends', description: 'Track category value trends' },
        { title: 'Category Reports', description: 'Category value reports' },
      ]}
    />
  );
}
