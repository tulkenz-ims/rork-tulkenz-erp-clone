import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { TrendingDown } from 'lucide-react-native';

export default function WriteDownsScreen() {
  return (
    <InventoryPlaceholder
      title="Write-Down Processing"
      description="Reduce inventory value for impaired items"
      icon={TrendingDown}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Write-Down Entry', description: 'Create write-down transactions' },
        { title: 'Approval Workflow', description: 'Require write-down approval' },
        { title: 'GL Integration', description: 'Post to general ledger' },
        { title: 'Write-Down Reports', description: 'Write-down analysis' },
      ]}
    />
  );
}
