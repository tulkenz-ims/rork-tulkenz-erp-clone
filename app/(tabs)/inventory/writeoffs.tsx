import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Trash2 } from 'lucide-react-native';

export default function WriteOffsScreen() {
  return (
    <InventoryPlaceholder
      title="Write-Off Processing"
      description="Process inventory write-offs for obsolete or damaged items"
      icon={Trash2}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Write-Off Entry', description: 'Create write-off transactions' },
        { title: 'Approval Workflow', description: 'Require write-off approval' },
        { title: 'GL Integration', description: 'Post to general ledger' },
        { title: 'Write-Off Reports', description: 'Write-off analysis' },
      ]}
    />
  );
}
