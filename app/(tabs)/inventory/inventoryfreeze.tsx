import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Snowflake } from 'lucide-react-native';

export default function InventoryFreezeScreen() {
  return (
    <InventoryPlaceholder
      title="Inventory Freeze"
      description="Freeze inventory during physical counts"
      icon={Snowflake}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Freeze Control', description: 'Freeze inventory transactions' },
        { title: 'Partial Freeze', description: 'Freeze by zone or location' },
        { title: 'Freeze Status', description: 'Track freeze status' },
        { title: 'Unfreeze', description: 'Release frozen inventory' },
      ]}
    />
  );
}
