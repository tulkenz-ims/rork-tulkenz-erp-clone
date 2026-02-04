import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Hash } from 'lucide-react-native';

export default function LotNumbersScreen() {
  return (
    <InventoryPlaceholder
      title="Lot Numbers"
      description="Generate and manage lot number sequences and formats"
      icon={Hash}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Lot Numbering', description: 'Automatic lot number generation' },
        { title: 'Number Formats', description: 'Configure lot number formats' },
        { title: 'Manual Entry', description: 'Support vendor lot numbers' },
        { title: 'Number Validation', description: 'Validate lot number uniqueness' },
      ]}
    />
  );
}
