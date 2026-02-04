import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Clipboard } from 'lucide-react-native';

export default function PhysicalInventoryScreen() {
  return (
    <InventoryPlaceholder
      title="Physical Inventory"
      description="Conduct full physical inventory counts"
      icon={Clipboard}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Physical Count', description: 'Full inventory counts' },
        { title: 'Count Zones', description: 'Divide into count zones' },
        { title: 'Count Teams', description: 'Assign count teams' },
        { title: 'Reconciliation', description: 'Reconcile count results' },
      ]}
    />
  );
}
