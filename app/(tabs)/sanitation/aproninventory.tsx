import { Shirt } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function ApronInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Apron/Smock Inventory"
      description="Inventory tracking for aprons and smocks"
      icon={Shirt}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Stock Count', description: 'Current inventory levels' },
        { title: 'Size Tracking', description: 'Track by size' },
        { title: 'Type/Style', description: 'Different apron types' },
        { title: 'Condition', description: 'Assess garment condition' },
        { title: 'Replacement Schedule', description: 'Plan replacements' },
      ]}
    />
  );
}
