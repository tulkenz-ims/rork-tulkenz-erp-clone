import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Container } from 'lucide-react-native';

export default function TareWeightScreen() {
  return (
    <CompliancePlaceholder
      title="Package Tare Weight Documentation"
      description="Document tare weights for packaging materials"
      icon={Container}
      color="#F59E0B"
      category="Weights & Measures"
      features={[
        { title: 'Packaging List', description: 'List packaging materials' },
        { title: 'Tare Weights', description: 'Document verified tare weights' },
        { title: 'Verification Method', description: 'Track verification procedure' },
        { title: 'Update Records', description: 'Document tare weight changes' },
        { title: 'Audit Trail', description: 'Maintain verification history' },
      ]}
    />
  );
}
