import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { BarChart2 } from 'lucide-react-native';

export default function AbcClassificationScreen() {
  return (
    <InventoryPlaceholder
      title="ABC Classification"
      description="Classify items by value for count frequency"
      icon={BarChart2}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'ABC Analysis', description: 'Run ABC classification' },
        { title: 'Class Rules', description: 'Define A, B, C thresholds' },
        { title: 'Count Frequency', description: 'Set count frequency by class' },
        { title: 'Class Reports', description: 'Report by ABC class' },
      ]}
    />
  );
}
