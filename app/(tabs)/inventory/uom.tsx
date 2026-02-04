import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Scale } from 'lucide-react-native';

export default function UomScreen() {
  return (
    <InventoryPlaceholder
      title="Unit of Measure"
      description="Define and manage units of measure for inventory tracking"
      icon={Scale}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'UOM Definition', description: 'Create and manage units of measure' },
        { title: 'Base Units', description: 'Set base units for inventory tracking' },
        { title: 'UOM Classes', description: 'Group related units (weight, volume, length)' },
        { title: 'Multi-UOM Support', description: 'Support multiple UOMs per item' },
      ]}
    />
  );
}
