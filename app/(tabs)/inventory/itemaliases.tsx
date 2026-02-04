import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Link } from 'lucide-react-native';

export default function ItemAliasesScreen() {
  return (
    <InventoryPlaceholder
      title="Item Aliases"
      description="Manage alternate names and identifiers for items"
      icon={Link}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Alias Management', description: 'Create alternate names for items' },
        { title: 'Alias Types', description: 'Categorize aliases (customer, vendor, internal)' },
        { title: 'Alias Search', description: 'Find items by any alias' },
        { title: 'Alias History', description: 'Track alias changes over time' },
      ]}
    />
  );
}
