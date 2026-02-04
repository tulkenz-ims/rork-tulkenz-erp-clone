import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Lock } from 'lucide-react-native';

export default function BondedScreen() {
  return (
    <InventoryPlaceholder
      title="Bonded Inventory"
      description="Manage inventory in bonded warehouse status"
      icon={Lock}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Bonded Status', description: 'Track bonded inventory' },
        { title: 'Customs Compliance', description: 'Maintain customs compliance' },
        { title: 'Release Processing', description: 'Process bonded releases' },
        { title: 'Bonded Reports', description: 'Bonded inventory reports' },
      ]}
    />
  );
}
