import { Package } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function PaperTowelInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Paper Towel Inventory"
      description="Inventory tracking for paper towel supplies"
      icon={Package}
      color="#14B8A6"
      category="Facility Consumable Supplies"
      features={[
        { title: 'Current Stock', description: 'Track current inventory levels' },
        { title: 'Roll Types', description: 'Track different roll types/sizes' },
        { title: 'Usage Rate', description: 'Monitor consumption rate' },
        { title: 'Reorder Alert', description: 'Low stock notifications' },
        { title: 'Cost Tracking', description: 'Track supply costs' },
      ]}
    />
  );
}
