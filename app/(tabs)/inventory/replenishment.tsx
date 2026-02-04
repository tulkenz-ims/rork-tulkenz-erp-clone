import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { RefreshCw } from 'lucide-react-native';

export default function ReplenishmentScreen() {
  return (
    <InventoryPlaceholder
      title="Replenishment Suggestions"
      description="Get suggestions for inventory replenishment"
      icon={RefreshCw}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'Replenishment List', description: 'View replenishment needs' },
        { title: 'Suggested Orders', description: 'Suggested order quantities' },
        { title: 'Priority Ranking', description: 'Rank by urgency' },
        { title: 'Create Orders', description: 'Generate purchase orders' },
      ]}
    />
  );
}
