import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Snail } from 'lucide-react-native';

export default function SlowMovingScreen() {
  return (
    <InventoryPlaceholder
      title="Slow-Moving Inventory"
      description="Track items with low turnover rates"
      icon={Snail}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'Slow Movers', description: 'Identify slow-moving items' },
        { title: 'Turnover Analysis', description: 'Track turnover rates' },
        { title: 'Action Recommendations', description: 'Suggest actions' },
        { title: 'Slow Mover Reports', description: 'Slow-moving analysis' },
      ]}
    />
  );
}
