import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { CircleDot } from 'lucide-react-native';

export default function LotStatusScreen() {
  return (
    <InventoryPlaceholder
      title="Lot Status Management"
      description="Manage lot status including available, hold, and quarantine"
      icon={CircleDot}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Status Types', description: 'Available, Hold, Quarantine, Released' },
        { title: 'Status Changes', description: 'Update lot status with reason codes' },
        { title: 'Hold Management', description: 'Place and release lot holds' },
        { title: 'Status History', description: 'Track all status changes' },
      ]}
    />
  );
}
