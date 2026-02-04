import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Scale } from 'lucide-react-native';

export default function WeightsMeasuresInspectionScreen() {
  return (
    <CompliancePlaceholder
      title="Weights & Measures Inspection"
      description="Track state weights and measures inspection records"
      icon={Scale}
      color="#6366F1"
      category="Weights & Measures"
      features={[
        { title: 'Inspection Records', description: 'Store inspection reports' },
        { title: 'Inspector Information', description: 'Document inspector details' },
        { title: 'Findings', description: 'Track inspection findings' },
        { title: 'Corrective Actions', description: 'Document corrections made' },
        { title: 'Next Inspection', description: 'Monitor inspection schedule' },
      ]}
    />
  );
}
