import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { ArrowLeftRight } from 'lucide-react-native';

export default function TransfersScreen() {
  return (
    <InventoryPlaceholder
      title="Inventory Transfers"
      description="Transfer inventory between locations"
      icon={ArrowLeftRight}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Transfer Creation', description: 'Create transfer orders' },
        { title: 'Transfer Types', description: 'Warehouse, bin, location transfers' },
        { title: 'Transfer Status', description: 'Track transfer progress' },
        { title: 'Transfer History', description: 'View transfer history' },
      ]}
    />
  );
}
