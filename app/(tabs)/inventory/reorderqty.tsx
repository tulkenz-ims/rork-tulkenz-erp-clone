import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Calculator } from 'lucide-react-native';

export default function ReorderQtyScreen() {
  return (
    <InventoryPlaceholder
      title="Reorder Quantity"
      description="Define optimal reorder quantities for items"
      icon={Calculator}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'ROQ Setup', description: 'Set reorder quantities' },
        { title: 'ROQ Calculation', description: 'Calculate optimal quantities' },
        { title: 'Pack Quantities', description: 'Round to pack sizes' },
        { title: 'ROQ Reports', description: 'Reorder quantity analysis' },
      ]}
    />
  );
}
