import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Settings } from 'lucide-react-native';

export default function ItemAttributesScreen() {
  return (
    <InventoryPlaceholder
      title="Item Attributes"
      description="Manage custom attributes and properties for items"
      icon={Settings}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Custom Attributes', description: 'Define custom item attributes' },
        { title: 'Attribute Types', description: 'Support text, numeric, date, list values' },
        { title: 'Attribute Groups', description: 'Organize attributes into groups' },
        { title: 'Attribute Search', description: 'Search items by attribute values' },
      ]}
    />
  );
}
