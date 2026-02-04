import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Truck } from 'lucide-react-native';

export default function InTransitQtyScreen() {
  return (
    <InventoryPlaceholder
      title="In-Transit Quantity"
      description="Track inventory currently in transit between locations"
      icon={Truck}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'In-Transit View', description: 'View in-transit quantities' },
        { title: 'Transfer Tracking', description: 'Link to transfer orders' },
        { title: 'ETA Tracking', description: 'Expected arrival times' },
        { title: 'Transit Reports', description: 'In-transit analysis' },
      ]}
    />
  );
}
