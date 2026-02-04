import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Eye } from 'lucide-react-native';

export default function ConsignmentTrackingScreen() {
  return (
    <InventoryPlaceholder
      title="Consignment Tracking"
      description="Track consignment inventory movements and status"
      icon={Eye}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Movement Tracking', description: 'Track consignment movements' },
        { title: 'Status Updates', description: 'Monitor consignment status' },
        { title: 'Location Tracking', description: 'Track by location' },
        { title: 'Tracking Reports', description: 'Consignment tracking reports' },
      ]}
    />
  );
}
