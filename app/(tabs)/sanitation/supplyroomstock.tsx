import { Warehouse } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function SupplyRoomStockScreen() {
  return (
    <SanitationPlaceholder
      title="Supply Room Stock Check"
      description="Regular stock check for supply room inventory"
      icon={Warehouse}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Physical Count', description: 'Count all items in stock' },
        { title: 'Variance Check', description: 'Compare to expected levels' },
        { title: 'Organization', description: 'Verify proper organization' },
        { title: 'Expiration Check', description: 'Identify expired items' },
        { title: 'Restock Needs', description: 'List items needing restock' },
      ]}
    />
  );
}
