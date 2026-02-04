import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Calculator } from 'lucide-react-native';

export default function ValuationMethodsScreen() {
  return (
    <InventoryPlaceholder
      title="Valuation Methods"
      description="Configure FIFO, LIFO, Average, and Standard costing methods"
      icon={Calculator}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Method Configuration', description: 'Set valuation methods' },
        { title: 'FIFO/LIFO', description: 'First-in/Last-in costing' },
        { title: 'Average Cost', description: 'Weighted average costing' },
        { title: 'Standard Cost', description: 'Standard cost method' },
      ]}
    />
  );
}
