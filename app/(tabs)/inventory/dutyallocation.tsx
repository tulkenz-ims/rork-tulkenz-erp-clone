import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { FileCheck } from 'lucide-react-native';

export default function DutyAllocationScreen() {
  return (
    <InventoryPlaceholder
      title="Duty Allocation"
      description="Allocate customs duties and tariffs to items"
      icon={FileCheck}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Duty Setup', description: 'Configure duty allocation' },
        { title: 'Tariff Codes', description: 'Manage tariff classifications' },
        { title: 'Auto Allocation', description: 'Automatic duty allocation' },
        { title: 'Duty Reports', description: 'Duty cost analysis' },
      ]}
    />
  );
}
