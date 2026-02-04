import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { TrendingDown } from 'lucide-react-native';

export default function ConsignmentConsumptionScreen() {
  return (
    <InventoryPlaceholder
      title="Consignment Consumption"
      description="Record consumption of consignment inventory"
      icon={TrendingDown}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Consumption Entry', description: 'Record usage of consignment' },
        { title: 'Auto Consumption', description: 'Automatic consumption recording' },
        { title: 'Consumption History', description: 'Track consumption history' },
        { title: 'Consumption Reports', description: 'Consumption analysis' },
      ]}
    />
  );
}
