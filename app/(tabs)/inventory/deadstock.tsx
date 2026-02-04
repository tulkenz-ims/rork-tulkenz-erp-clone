import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { XCircle } from 'lucide-react-native';

export default function DeadStockScreen() {
  return (
    <InventoryPlaceholder
      title="Dead Stock"
      description="Identify inventory with no movement"
      icon={XCircle}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'Dead Stock ID', description: 'Identify zero-movement items' },
        { title: 'Age Analysis', description: 'Track time without movement' },
        { title: 'Disposition Options', description: 'Recommend actions' },
        { title: 'Dead Stock Reports', description: 'Dead stock analysis' },
      ]}
    />
  );
}
