import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Map } from 'lucide-react-native';

export default function TraceabilityPlanScreen() {
  return (
    <CompliancePlaceholder
      title="Traceability Plan Documentation"
      description="Comprehensive traceability plan documentation for FSMA 204 compliance"
      icon={Map}
      color="#6366F1"
      category="FSMA 204 / Traceability"
      features={[
        { title: 'Food Traceability List', description: 'Identify FTL foods handled by facility' },
        { title: 'Record Procedures', description: 'Document record creation and maintenance' },
        { title: 'System Description', description: 'Describe traceability system and software' },
        { title: 'Point of Contact', description: 'Identify traceability plan contacts' },
        { title: 'Training Records', description: 'Document staff training on traceability' },
      ]}
    />
  );
}
