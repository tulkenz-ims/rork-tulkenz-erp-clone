import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { AlertCircle } from 'lucide-react-native';

export default function QualityHoldScreen() {
  return (
    <InventoryPlaceholder
      title="Quality Hold Inventory"
      description="Manage inventory on quality hold"
      icon={AlertCircle}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Quality Holds', description: 'Place items on QC hold' },
        { title: 'Inspection Tracking', description: 'Track inspection status' },
        { title: 'Release Workflow', description: 'QC release workflow' },
        { title: 'Hold Reports', description: 'Quality hold reports' },
      ]}
    />
  );
}
