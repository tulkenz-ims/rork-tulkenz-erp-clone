import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { ArrowDownUp } from 'lucide-react-native';

export default function FifoScreen() {
  return (
    <InventoryPlaceholder
      title="FIFO Enforcement"
      description="First In First Out picking and allocation rules"
      icon={ArrowDownUp}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'FIFO Rules', description: 'Configure FIFO allocation rules' },
        { title: 'Receipt Date Tracking', description: 'Track receipt dates' },
        { title: 'FIFO Allocation', description: 'Automatic FIFO allocation' },
        { title: 'FIFO Reports', description: 'Track FIFO compliance' },
      ]}
    />
  );
}
