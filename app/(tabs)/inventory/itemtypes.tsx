import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Package } from 'lucide-react-native';

export default function ItemTypesScreen() {
  return (
    <InventoryPlaceholder
      title="Item Types"
      description="Define and manage item types including raw materials, WIP, finished goods, and MRO"
      icon={Package}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Type Configuration', description: 'Configure item types (Raw, WIP, Finished, MRO)' },
        { title: 'Type Rules', description: 'Set rules and behaviors for each item type' },
        { title: 'Type Transitions', description: 'Manage item type changes through lifecycle' },
        { title: 'Type Reporting', description: 'Filter and report inventory by type' },
      ]}
    />
  );
}
