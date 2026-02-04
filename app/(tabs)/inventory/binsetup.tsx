import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Layout } from 'lucide-react-native';

export default function BinSetupScreen() {
  return (
    <InventoryPlaceholder
      title="Bin Setup"
      description="Configure bin locations and naming conventions"
      icon={Layout}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Bin Creation', description: 'Create new storage bins' },
        { title: 'Bin Naming', description: 'Define bin naming conventions' },
        { title: 'Bin Hierarchy', description: 'Set up aisle/rack/bin structure' },
        { title: 'Bulk Setup', description: 'Create bins in bulk' },
      ]}
    />
  );
}
