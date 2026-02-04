import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { RefreshCw } from 'lucide-react-native';

export default function UomConversionsScreen() {
  return (
    <InventoryPlaceholder
      title="UOM Conversions"
      description="Set up conversion factors between different units of measure"
      icon={RefreshCw}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Conversion Factors', description: 'Define conversion ratios between units' },
        { title: 'Item-Specific Conversions', description: 'Set unique conversions per item' },
        { title: 'Automatic Conversion', description: 'Auto-convert quantities during transactions' },
        { title: 'Conversion Validation', description: 'Validate conversion accuracy' },
      ]}
    />
  );
}
