import { User } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function BeardNetInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Beard Net Inventory"
      description="Inventory tracking for beard nets"
      icon={User}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Stock Levels', description: 'Current beard net inventory' },
        { title: 'Style Types', description: 'Different beard net styles' },
        { title: 'Usage Tracking', description: 'Monitor consumption' },
        { title: 'Reorder Point', description: 'Minimum stock triggers' },
        { title: 'Vendor Info', description: 'Supplier details' },
      ]}
    />
  );
}
