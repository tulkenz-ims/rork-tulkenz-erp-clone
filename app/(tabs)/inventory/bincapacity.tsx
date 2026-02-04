import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Maximize } from 'lucide-react-native';

export default function BinCapacityScreen() {
  return (
    <InventoryPlaceholder
      title="Bin Capacity"
      description="Define and track bin storage capacity"
      icon={Maximize}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Capacity Settings', description: 'Set bin capacity limits' },
        { title: 'Capacity Tracking', description: 'Track bin utilization' },
        { title: 'Capacity Alerts', description: 'Alert when capacity exceeded' },
        { title: 'Capacity Reports', description: 'Utilization reports' },
      ]}
    />
  );
}
