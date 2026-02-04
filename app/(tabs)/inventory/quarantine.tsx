import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { ShieldAlert } from 'lucide-react-native';

export default function QuarantineScreen() {
  return (
    <InventoryPlaceholder
      title="Quarantine Inventory"
      description="Manage inventory in quarantine status"
      icon={ShieldAlert}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Quarantine Setup', description: 'Configure quarantine areas' },
        { title: 'Hold Management', description: 'Place items in quarantine' },
        { title: 'Release Process', description: 'Release from quarantine' },
        { title: 'Quarantine Reports', description: 'Quarantine status reports' },
      ]}
    />
  );
}
