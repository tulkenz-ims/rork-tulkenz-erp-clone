import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Thermometer } from 'lucide-react-native';

export default function ReceivingTempScreen() {
  return (
    <QualityPlaceholder
      title="Temperature at Receiving Log"
      description="Record product temperatures upon receipt"
      icon={Thermometer}
      color="#06B6D4"
      category="Receiving & Supplier"
      features={[
        { title: 'Shipment ID', description: 'Link to incoming shipment' },
        { title: 'Product Type', description: 'Refrigerated, frozen, ambient' },
        { title: 'Temperature Reading', description: 'Record actual temperature' },
        { title: 'Acceptable Range', description: 'Display required temperature' },
        { title: 'Accept/Reject', description: 'Temperature-based disposition' },
      ]}
    />
  );
}
