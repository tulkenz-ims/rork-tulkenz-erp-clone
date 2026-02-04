import { User } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function HairnetInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Hairnet Inventory Log"
      description="Inventory tracking for hairnets"
      icon={User}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Current Stock', description: 'Track hairnet inventory' },
        { title: 'Color Varieties', description: 'Track different colors' },
        { title: 'Usage Rate', description: 'Monitor consumption' },
        { title: 'Storage Location', description: 'Track by storage area' },
        { title: 'Reorder Alerts', description: 'Low stock notifications' },
      ]}
    />
  );
}
