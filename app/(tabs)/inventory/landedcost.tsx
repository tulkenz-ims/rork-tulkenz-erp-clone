import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Ship } from 'lucide-react-native';

export default function LandedCostScreen() {
  return (
    <InventoryPlaceholder
      title="Landed Cost Calculation"
      description="Calculate true cost including freight, duties, and fees"
      icon={Ship}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Landed Cost Setup', description: 'Configure landed cost elements' },
        { title: 'Cost Allocation', description: 'Allocate costs to items' },
        { title: 'Auto Calculation', description: 'Automatic cost calculation' },
        { title: 'Landed Cost Reports', description: 'Landed cost analysis' },
      ]}
    />
  );
}
