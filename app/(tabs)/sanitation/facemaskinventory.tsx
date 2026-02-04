import { User } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function FaceMaskInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Face Mask Inventory"
      description="Inventory tracking for face masks"
      icon={User}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Stock Count', description: 'Current mask inventory' },
        { title: 'Mask Types', description: 'Track different mask types' },
        { title: 'Expiration Dates', description: 'Monitor mask expiration' },
        { title: 'Usage Rate', description: 'Consumption tracking' },
        { title: 'Compliance Stock', description: 'Ensure adequate supply' },
      ]}
    />
  );
}
