import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Globe } from 'lucide-react-native';

export default function CountryOfOriginScreen() {
  return (
    <CompliancePlaceholder
      title="Country of Origin Documentation"
      description="Track country of origin labeling and documentation"
      icon={Globe}
      color="#3B82F6"
      category="Import / Export Compliance"
      features={[
        { title: 'Origin Records', description: 'Document product origins' },
        { title: 'Supplier Declarations', description: 'Store supplier COO statements' },
        { title: 'Label Compliance', description: 'Track labeling requirements' },
        { title: 'Verification', description: 'Document origin verification' },
        { title: 'Audit Trail', description: 'Maintain origin audit records' },
      ]}
    />
  );
}
