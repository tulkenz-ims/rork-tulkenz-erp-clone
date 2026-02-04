import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Receipt } from 'lucide-react-native';

export default function ItemPricingScreen() {
  return (
    <InventoryPlaceholder
      title="Item Pricing"
      description="Manage item pricing tiers, customer-specific pricing, and price lists"
      icon={Receipt}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Price Lists', description: 'Create and manage multiple price lists' },
        { title: 'Price Tiers', description: 'Set quantity-based pricing tiers' },
        { title: 'Customer Pricing', description: 'Define customer-specific pricing' },
        { title: 'Price Effective Dates', description: 'Schedule price changes' },
      ]}
    />
  );
}
