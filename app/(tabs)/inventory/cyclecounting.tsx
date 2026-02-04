import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { BarChart3 } from 'lucide-react-native';

export default function CycleCountingScreen() {
  return (
    <InventoryPlaceholder
      title="Cycle Counting"
      description="Perform regular cycle counts to maintain accuracy"
      icon={BarChart3}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Count Programs', description: 'Set up cycle count programs' },
        { title: 'Count Lists', description: 'Generate count lists' },
        { title: 'Count Entry', description: 'Enter count results' },
        { title: 'Variance Analysis', description: 'Review count variances' },
      ]}
    />
  );
}
