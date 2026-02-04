import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { ClipboardCheck } from 'lucide-react-native';

export default function ContractComplianceScreen() {
  return (
    <CompliancePlaceholder
      title="Contract Compliance Checklist"
      description="Track compliance with contractual obligations"
      icon={ClipboardCheck}
      color="#8B5CF6"
      category="Customer & Contract Compliance"
      features={[
        { title: 'Contract List', description: 'List active contracts' },
        { title: 'Obligations', description: 'Track key obligations' },
        { title: 'Compliance Status', description: 'Monitor compliance' },
        { title: 'Deliverables', description: 'Track deliverable status' },
        { title: 'Issues', description: 'Document compliance issues' },
      ]}
    />
  );
}
