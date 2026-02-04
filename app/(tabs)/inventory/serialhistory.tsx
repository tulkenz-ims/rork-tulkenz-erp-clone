import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { History } from 'lucide-react-native';

export default function SerialHistoryScreen() {
  return (
    <InventoryPlaceholder
      title="Serial Number History"
      description="View complete history of each serialized item"
      icon={History}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Full History', description: 'Complete serial number history' },
        { title: 'Transaction Log', description: 'All transactions for serial' },
        { title: 'Location History', description: 'Track serial movements' },
        { title: 'Owner History', description: 'Track ownership changes' },
      ]}
    />
  );
}
