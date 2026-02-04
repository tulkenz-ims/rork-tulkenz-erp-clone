import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { TrendingDown } from 'lucide-react-native';

export default function CostVarianceScreen() {
  return (
    <InventoryPlaceholder
      title="Cost Variance Tracking"
      description="Track and analyze cost variances"
      icon={TrendingDown}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Variance Detection', description: 'Identify cost variances' },
        { title: 'Variance Analysis', description: 'Analyze variance causes' },
        { title: 'PPV Tracking', description: 'Purchase price variance' },
        { title: 'Variance Reports', description: 'Variance reporting' },
      ]}
    />
  );
}
