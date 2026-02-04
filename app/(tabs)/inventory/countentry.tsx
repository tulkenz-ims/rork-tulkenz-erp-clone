import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Edit } from 'lucide-react-native';

export default function CountEntryScreen() {
  return (
    <InventoryPlaceholder
      title="Count Entry"
      description="Enter count results and record variances"
      icon={Edit}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Count Input', description: 'Enter count quantities' },
        { title: 'Barcode Scanning', description: 'Scan items for counting' },
        { title: 'Recount Support', description: 'Request recounts' },
        { title: 'Count Validation', description: 'Validate count entries' },
      ]}
    />
  );
}
