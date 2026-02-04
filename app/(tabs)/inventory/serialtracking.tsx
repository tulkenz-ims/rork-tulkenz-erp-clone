import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Scan } from 'lucide-react-native';

export default function SerialTrackingScreen() {
  return (
    <InventoryPlaceholder
      title="Serial Number Tracking"
      description="Track individual units by unique serial numbers"
      icon={Scan}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Serial Management', description: 'Track items by serial number' },
        { title: 'Serial Transactions', description: 'Record serial in all transactions' },
        { title: 'Serial Lookup', description: 'Find items by serial number' },
        { title: 'Serial Reports', description: 'Generate serial-based reports' },
      ]}
    />
  );
}
