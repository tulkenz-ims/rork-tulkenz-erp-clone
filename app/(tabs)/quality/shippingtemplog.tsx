import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Thermometer } from 'lucide-react-native';

export default function ShippingTempLogScreen() {
  return (
    <QualityPlaceholder
      title="Shipping Temperature Log"
      description="Document product temperatures during shipping"
      icon={Thermometer}
      color="#06B6D4"
      category="Shipping & Distribution"
      features={[
        { title: 'Shipment ID', description: 'Shipment tracking number' },
        { title: 'Product Temp', description: 'Temperature at loading' },
        { title: 'Trailer Temp', description: 'Trailer temperature' },
        { title: 'Data Logger', description: 'Temperature logger ID' },
        { title: 'Verification', description: 'Temperature compliance' },
      ]}
    />
  );
}
