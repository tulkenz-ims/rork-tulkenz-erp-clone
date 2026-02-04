import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { ShoppingCart } from 'lucide-react-native';

export default function OnOrderScreen() {
  return (
    <InventoryPlaceholder
      title="On-Order Quantity"
      description="Track inventory on purchase orders not yet received"
      icon={ShoppingCart}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'On-Order View', description: 'View quantities on order' },
        { title: 'PO Tracking', description: 'Link to purchase orders' },
        { title: 'Expected Dates', description: 'Expected receipt dates' },
        { title: 'On-Order Reports', description: 'On-order analysis' },
      ]}
    />
  );
}
