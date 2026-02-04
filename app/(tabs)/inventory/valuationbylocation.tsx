import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { MapPin } from 'lucide-react-native';

export default function ValuationByLocationScreen() {
  return (
    <InventoryPlaceholder
      title="Valuation by Location"
      description="View inventory value by warehouse and location"
      icon={MapPin}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Location Values', description: 'Value by warehouse/location' },
        { title: 'Location Comparison', description: 'Compare location values' },
        { title: 'Distribution Analysis', description: 'Analyze value distribution' },
        { title: 'Location Reports', description: 'Location value reports' },
      ]}
    />
  );
}
