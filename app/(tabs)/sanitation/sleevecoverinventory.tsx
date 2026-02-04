import { Shirt } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function SleeveCoverInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Sleeve Cover Inventory"
      description="Inventory tracking for sleeve covers"
      icon={Shirt}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Stock Levels', description: 'Current inventory' },
        { title: 'Material Type', description: 'Disposable vs. reusable' },
        { title: 'Usage Tracking', description: 'Monitor consumption' },
        { title: 'Size Options', description: 'Track available sizes' },
        { title: 'Reorder Points', description: 'Minimum stock alerts' },
      ]}
    />
  );
}
