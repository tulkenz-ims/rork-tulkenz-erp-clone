import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Award } from 'lucide-react-native';

export default function COCScreen() {
  return (
    <QualityPlaceholder
      title="Certificate of Conformance"
      description="Generate certificate of conformance for shipments"
      icon={Award}
      color="#F59E0B"
      category="Shipping & Distribution"
      features={[
        { title: 'Shipment Details', description: 'Order and product info' },
        { title: 'Specifications', description: 'Product specifications met' },
        { title: 'Test Results', description: 'Link to test data' },
        { title: 'Certification', description: 'Conformance statement' },
        { title: 'Authorization', description: 'QA signature' },
      ]}
    />
  );
}
