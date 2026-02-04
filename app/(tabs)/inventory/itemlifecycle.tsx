import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { CircleDot } from 'lucide-react-native';

export default function ItemLifecycleScreen() {
  return (
    <InventoryPlaceholder
      title="Item Lifecycle Status"
      description="Track item status through its lifecycle from active to obsolete"
      icon={CircleDot}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Status Management', description: 'Manage active/inactive/obsolete status' },
        { title: 'Status Transitions', description: 'Define allowed status changes' },
        { title: 'Lifecycle Rules', description: 'Set rules for each lifecycle stage' },
        { title: 'Status History', description: 'Track status changes over time' },
      ]}
    />
  );
}
