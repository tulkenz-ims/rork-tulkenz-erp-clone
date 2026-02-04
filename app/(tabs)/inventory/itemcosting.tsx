import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { DollarSign } from 'lucide-react-native';

export default function ItemCostingScreen() {
  return (
    <InventoryPlaceholder
      title="Item Costing"
      description="Manage item costs including standard, average, FIFO, and last cost"
      icon={DollarSign}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Standard Cost', description: 'Set and maintain standard costs' },
        { title: 'Average Cost', description: 'Track weighted average costs' },
        { title: 'FIFO Cost', description: 'First-in-first-out cost tracking' },
        { title: 'Last Cost', description: 'Track most recent purchase cost' },
        { title: 'Cost History', description: 'View cost changes over time' },
      ]}
    />
  );
}
