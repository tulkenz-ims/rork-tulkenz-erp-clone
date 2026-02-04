import QualityPlaceholder from '@/components/QualityPlaceholder';
import { ClipboardCheck } from 'lucide-react-native';

export default function SupplierAuditScreen() {
  return (
    <QualityPlaceholder
      title="Supplier Audit Form"
      description="Conduct and document supplier audits"
      icon={ClipboardCheck}
      color="#10B981"
      category="Supplier Quality"
      features={[
        { title: 'Supplier', description: 'Supplier being audited' },
        { title: 'Audit Scope', description: 'Areas to audit' },
        { title: 'Checklist', description: 'Audit criteria' },
        { title: 'Findings', description: 'Document observations' },
        { title: 'Score', description: 'Overall audit score' },
      ]}
    />
  );
}
