import { Square } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function RagInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Rag Inventory Log"
      description="Inventory tracking for cleaning rags"
      icon={Square}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Stock Count', description: 'Current rag inventory' },
        { title: 'Color Coding', description: 'Track by color code' },
        { title: 'Condition', description: 'Assess rag condition' },
        { title: 'Laundry Cycle', description: 'Track laundry rotation' },
        { title: 'Replacement Schedule', description: 'Plan rag replacement' },
      ]}
    />
  );
}
