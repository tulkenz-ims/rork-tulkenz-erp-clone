import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Tag } from 'lucide-react-native';

export default function ItemSkusScreen() {
  return (
    <InventoryPlaceholder
      title="Item Numbers/SKUs"
      description="Manage item numbering schemes, SKUs, and unique identifiers"
      icon={Tag}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'SKU Generation', description: 'Automatic or manual SKU number generation' },
        { title: 'Numbering Schemes', description: 'Configure item numbering patterns and sequences' },
        { title: 'Barcode Assignment', description: 'Assign barcodes and QR codes to items' },
        { title: 'SKU Validation', description: 'Validate SKU uniqueness and format compliance' },
      ]}
    />
  );
}
