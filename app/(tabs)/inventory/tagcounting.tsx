import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Tag } from 'lucide-react-native';

export default function TagCountingScreen() {
  return (
    <InventoryPlaceholder
      title="Tag Counting"
      description="Use tags for physical inventory counts"
      icon={Tag}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Tag Generation', description: 'Generate count tags' },
        { title: 'Tag Distribution', description: 'Distribute tags to counters' },
        { title: 'Tag Entry', description: 'Enter tag count results' },
        { title: 'Tag Reconciliation', description: 'Reconcile tag counts' },
      ]}
    />
  );
}
