import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { ArrowLeft } from 'lucide-react-native';

export default function BackwardTraceScreen() {
  return (
    <InventoryPlaceholder
      title="Backward Traceability"
      description="Trace lot sources back to vendors and receipts"
      icon={ArrowLeft}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Backward Trace', description: 'Trace lot back to source' },
        { title: 'Vendor Trace', description: 'Find vendor and receipt info' },
        { title: 'Component Trace', description: 'Find component lots used' },
        { title: 'Trace Reports', description: 'Generate backward trace reports' },
      ]}
    />
  );
}
