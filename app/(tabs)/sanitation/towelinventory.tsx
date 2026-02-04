import { Square } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function TowelInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Towel Inventory Log"
      description="Inventory tracking for cleaning towels"
      icon={Square}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Stock Count', description: 'Current towel inventory' },
        { title: 'Towel Types', description: 'Track by towel type' },
        { title: 'Color Coding', description: 'Track color-coded towels' },
        { title: 'Laundry Status', description: 'Clean vs. soiled counts' },
        { title: 'Replacement Needs', description: 'Identify worn towels' },
      ]}
    />
  );
}
