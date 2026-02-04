import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Package } from 'lucide-react-native';

export default function FinishedProductInspectionScreen() {
  return (
    <QualityPlaceholder
      title="Finished Product Inspection"
      description="Final inspection before shipping"
      icon={Package}
      color="#3B82F6"
      category="Shipping & Distribution"
      features={[
        { title: 'Product Details', description: 'Product, lot, quantity' },
        { title: 'Visual Check', description: 'Packaging and labeling' },
        { title: 'Documentation', description: 'Verify paperwork complete' },
        { title: 'Quality Check', description: 'Final quality verification' },
        { title: 'Release', description: 'Approval to ship' },
      ]}
    />
  );
}
