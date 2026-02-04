import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Truck } from 'lucide-react-native';

export default function TrailerInspectionScreen() {
  return (
    <QualityPlaceholder
      title="Trailer Inspection Form"
      description="Inspect trailers before loading"
      icon={Truck}
      color="#8B5CF6"
      category="Shipping & Distribution"
      features={[
        { title: 'Trailer ID', description: 'Trailer identification' },
        { title: 'Cleanliness', description: 'Interior cleanliness check' },
        { title: 'Condition', description: 'Structural condition' },
        { title: 'Temperature', description: 'Refrigeration unit check' },
        { title: 'Odors/Pests', description: 'Check for contamination' },
        { title: 'Approval', description: 'Accept or reject trailer' },
      ]}
    />
  );
}
