import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Truck } from 'lucide-react-native';

export default function LoadInspectionScreen() {
  return (
    <QualityPlaceholder
      title="Load Inspection Checklist"
      description="Inspect loads before shipment"
      icon={Truck}
      color="#10B981"
      category="Shipping & Distribution"
      features={[
        { title: 'Load Details', description: 'Shipment and carrier info' },
        { title: 'Product Verification', description: 'Correct product loaded' },
        { title: 'Quantity Check', description: 'Verify quantities' },
        { title: 'Stacking/Securing', description: 'Proper load securing' },
        { title: 'Sign-off', description: 'Load approval' },
      ]}
    />
  );
}
