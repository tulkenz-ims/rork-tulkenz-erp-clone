import { Package } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function TrashLinerInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Trash Liner Inventory"
      description="Inventory tracking for trash bag supplies"
      icon={Package}
      color="#14B8A6"
      category="Facility Consumable Supplies"
      features={[
        { title: 'Stock Levels', description: 'Current inventory by size' },
        { title: 'Size Varieties', description: 'Track different liner sizes' },
        { title: 'Usage Rate', description: 'Monitor consumption' },
        { title: 'Quality Specs', description: 'Thickness and strength ratings' },
        { title: 'Reorder Management', description: 'Automatic reorder triggers' },
      ]}
    />
  );
}
