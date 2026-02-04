import QualityPlaceholder from '@/components/QualityPlaceholder';
import { UserCheck } from 'lucide-react-native';

export default function SupplierApprovalScreen() {
  return (
    <QualityPlaceholder
      title="Supplier Approval Form"
      description="Document supplier qualification and approval"
      icon={UserCheck}
      color="#EC4899"
      category="Receiving & Supplier"
      features={[
        { title: 'Supplier Information', description: 'Company details and contacts' },
        { title: 'Qualification Criteria', description: 'Checklist of requirements' },
        { title: 'Document Collection', description: 'Certifications, audits, etc.' },
        { title: 'Risk Assessment', description: 'Supplier risk evaluation' },
        { title: 'Approval Decision', description: 'Approve/conditionally approve/reject' },
      ]}
    />
  );
}
