import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Settings } from 'lucide-react-native';

export default function LotAttributesScreen() {
  return (
    <InventoryPlaceholder
      title="Lot Attributes"
      description="Define and track custom attributes for each lot"
      icon={Settings}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Custom Attributes', description: 'Define lot-specific attributes' },
        { title: 'Attribute Values', description: 'Capture attribute values per lot' },
        { title: 'Attribute Search', description: 'Find lots by attribute values' },
        { title: 'Attribute Reports', description: 'Report on lot attributes' },
      ]}
    />
  );
}
