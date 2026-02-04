import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Lock } from 'lucide-react-native';

export default function BinRestrictionsScreen() {
  return (
    <InventoryPlaceholder
      title="Bin Restrictions"
      description="Set restrictions on what items can be stored in bins"
      icon={Lock}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Item Restrictions', description: 'Restrict items by bin' },
        { title: 'Category Restrictions', description: 'Restrict by category' },
        { title: 'Hazmat Restrictions', description: 'Hazardous material rules' },
        { title: 'Temperature Zones', description: 'Temperature-controlled bins' },
      ]}
    />
  );
}
