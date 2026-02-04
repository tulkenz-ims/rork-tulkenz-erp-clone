import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Building } from 'lucide-react-native';

export default function ThirdPartyScreen() {
  return (
    <InventoryPlaceholder
      title="Third-Party Inventory"
      description="Manage inventory held by third parties"
      icon={Building}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: '3PL Inventory', description: 'Track 3PL held inventory' },
        { title: 'External Locations', description: 'Manage external storage' },
        { title: 'Sync Management', description: 'Synchronize inventory data' },
        { title: '3PL Reports', description: 'Third-party inventory reports' },
      ]}
    />
  );
}
