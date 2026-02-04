import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { ArrowRight } from 'lucide-react-native';

export default function ForwardTraceScreen() {
  return (
    <InventoryPlaceholder
      title="Forward Traceability"
      description="Trace where lots were used or shipped"
      icon={ArrowRight}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Forward Trace', description: 'Trace lot forward to usage' },
        { title: 'Customer Trace', description: 'Find which customers received lot' },
        { title: 'Product Trace', description: 'Find products containing lot' },
        { title: 'Trace Reports', description: 'Generate forward trace reports' },
      ]}
    />
  );
}
