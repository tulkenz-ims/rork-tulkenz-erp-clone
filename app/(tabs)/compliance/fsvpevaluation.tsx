import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { ClipboardList } from 'lucide-react-native';

export default function FSVPEvaluationScreen() {
  return (
    <CompliancePlaceholder
      title="FSVP Supplier Evaluation"
      description="Track supplier evaluations under FSVP requirements"
      icon={ClipboardList}
      color="#10B981"
      category="Import / Export Compliance"
      features={[
        { title: 'Hazard Analysis', description: 'Document supplier hazard analysis' },
        { title: 'Supplier Performance', description: 'Track supplier performance' },
        { title: 'Verification Activities', description: 'Document verification methods' },
        { title: 'Reevaluation Schedule', description: 'Track reevaluation dates' },
        { title: 'Corrective Actions', description: 'Document supplier CAs' },
      ]}
    />
  );
}
