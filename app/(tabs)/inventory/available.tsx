import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { CheckCircle } from 'lucide-react-native';

export default function AvailableScreen() {
  return (
    <InventoryPlaceholder
      title="Available Quantity"
      description="Track available inventory after allocations and holds"
      icon={CheckCircle}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'Available Calculation', description: 'On-hand minus allocations/holds' },
        { title: 'Real-Time Updates', description: 'Live available quantities' },
        { title: 'ATP Tracking', description: 'Available-to-promise quantities' },
        { title: 'Availability Reports', description: 'Availability analysis' },
      ]}
    />
  );
}
