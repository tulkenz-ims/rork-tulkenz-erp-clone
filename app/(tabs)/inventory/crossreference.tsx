import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { GitBranch } from 'lucide-react-native';

export default function CrossReferenceScreen() {
  return (
    <InventoryPlaceholder
      title="Cross-Reference Parts"
      description="Link manufacturer and vendor part numbers to internal items"
      icon={GitBranch}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Manufacturer Parts', description: 'Link manufacturer part numbers' },
        { title: 'Vendor Parts', description: 'Map vendor part numbers to items' },
        { title: 'Cross-Reference Search', description: 'Find items by any part number' },
        { title: 'Part Number Import', description: 'Bulk import cross-references' },
      ]}
    />
  );
}
