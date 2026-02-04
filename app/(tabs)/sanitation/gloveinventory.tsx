import { Hand } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function GloveInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Glove Inventory Log"
      description="Inventory tracking for disposable gloves"
      icon={Hand}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Stock by Size', description: 'Track inventory by glove size' },
        { title: 'Material Type', description: 'Nitrile, latex, vinyl tracking' },
        { title: 'Usage Rate', description: 'Monitor consumption by department' },
        { title: 'Reorder Points', description: 'Set minimum stock levels' },
        { title: 'Cost Analysis', description: 'Track glove costs' },
      ]}
    />
  );
}
