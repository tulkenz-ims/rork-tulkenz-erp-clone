import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { FileSignature } from 'lucide-react-native';

export default function VendorAgreementScreen() {
  return (
    <CompliancePlaceholder
      title="Vendor/Supplier Agreement"
      description="Track vendor and supplier agreement documentation"
      icon={FileSignature}
      color="#F59E0B"
      category="Customer & Contract Compliance"
      features={[
        { title: 'Agreement List', description: 'List vendor agreements' },
        { title: 'Terms', description: 'Document key terms' },
        { title: 'Expiration', description: 'Track agreement expiration' },
        { title: 'Renewal Status', description: 'Monitor renewal needs' },
        { title: 'Compliance', description: 'Track vendor compliance' },
      ]}
    />
  );
}
