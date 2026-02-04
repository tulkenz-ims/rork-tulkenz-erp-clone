import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Truck } from 'lucide-react-native';

export default function InTransitScreen() {
  return (
    <InventoryPlaceholder
      title="In-Transit Tracking"
      description="Track inventory during transfer between locations"
      icon={Truck}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Transit Status', description: 'Track in-transit inventory' },
        { title: 'ETA Tracking', description: 'Estimated arrival times' },
        { title: 'Transit Alerts', description: 'Alerts for delays' },
        { title: 'Transit Reports', description: 'In-transit inventory reports' },
      ]}
    />
  );
}
