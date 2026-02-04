import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { FileText } from 'lucide-react-native';

export default function CertificationScopeScreen() {
  return (
    <CompliancePlaceholder
      title="Certification Scope Documentation"
      description="Document certification scope including products and processes"
      icon={FileText}
      color="#3B82F6"
      category="SQF / GFSI Certification"
      features={[
        { title: 'Scope Definition', description: 'Define certification scope boundaries' },
        { title: 'Product Categories', description: 'List products included in scope' },
        { title: 'Process Description', description: 'Document covered processes' },
        { title: 'Exclusions', description: 'Document any scope exclusions' },
        { title: 'Scope Changes', description: 'Track scope modifications' },
      ]}
    />
  );
}
