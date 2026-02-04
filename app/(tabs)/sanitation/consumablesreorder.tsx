import { ShoppingCart } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function ConsumablesReorderScreen() {
  return (
    <SanitationPlaceholder
      title="Consumables Reorder List"
      description="Manage reorder list for all consumable supplies"
      icon={ShoppingCart}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Reorder Items', description: 'Items needing reorder' },
        { title: 'Quantities', description: 'Reorder quantities' },
        { title: 'Vendor Selection', description: 'Preferred vendors' },
        { title: 'Priority', description: 'Urgent vs. routine orders' },
        { title: 'Order Status', description: 'Track order progress' },
      ]}
    />
  );
}
