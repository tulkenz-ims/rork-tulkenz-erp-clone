import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Scan } from 'lucide-react-native';

export default function AssetInventoryScreen() {
  return (
    <FinancePlaceholder
      title="Physical Inventory"
      description="Conduct physical inventory counts of fixed assets with barcode scanning."
      icon={Scan}
      color="#7C2D12"
      category="Fixed Assets"
      features={[
        { title: 'Inventory Counts', description: 'Schedule and conduct physical counts' },
        { title: 'Barcode Scanning', description: 'Scan asset tags for verification' },
        { title: 'Location Tracking', description: 'Verify asset locations' },
        { title: 'Variance Reports', description: 'Identify missing or misplaced assets' },
        { title: 'Count Reconciliation', description: 'Reconcile counts to asset register' },
        { title: 'Audit Trail', description: 'Document inventory activities' },
      ]}
    />
  );
}
