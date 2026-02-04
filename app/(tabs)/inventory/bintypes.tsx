import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Layers } from 'lucide-react-native';

export default function BinTypesScreen() {
  return (
    <InventoryPlaceholder
      title="Bin Types"
      description="Define bin types for different storage purposes"
      icon={Layers}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Type Configuration', description: 'Configure bin types (pick, bulk, quarantine)' },
        { title: 'Type Rules', description: 'Set rules for each bin type' },
        { title: 'Type Assignment', description: 'Assign types to bins' },
        { title: 'Type Reports', description: 'Report by bin type' },
      ]}
    />
  );
}
