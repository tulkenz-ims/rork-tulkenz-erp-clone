import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Archive } from 'lucide-react-native';

export default function ObsoleteScreen() {
  return (
    <InventoryPlaceholder
      title="Obsolete Inventory"
      description="Track and manage obsolete inventory items"
      icon={Archive}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'Obsolete Identification', description: 'Flag obsolete items' },
        { title: 'Obsolete Value', description: 'Track obsolete value' },
        { title: 'Disposition Planning', description: 'Plan item disposition' },
        { title: 'Obsolete Reports', description: 'Obsolete inventory reports' },
      ]}
    />
  );
}
