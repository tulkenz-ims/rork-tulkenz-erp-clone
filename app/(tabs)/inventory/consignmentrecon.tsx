import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { CheckSquare } from 'lucide-react-native';

export default function ConsignmentReconScreen() {
  return (
    <InventoryPlaceholder
      title="Consignment Reconciliation"
      description="Reconcile consignment inventory with vendors"
      icon={CheckSquare}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Reconciliation Process', description: 'Reconcile with vendor records' },
        { title: 'Variance Resolution', description: 'Resolve discrepancies' },
        { title: 'Settlement Generation', description: 'Generate settlement statements' },
        { title: 'Recon Reports', description: 'Reconciliation reports' },
      ]}
    />
  );
}
