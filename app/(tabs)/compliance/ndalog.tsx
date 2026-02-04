import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Lock } from 'lucide-react-native';

export default function NDALogScreen() {
  return (
    <CompliancePlaceholder
      title="Confidentiality/NDA Log"
      description="Track non-disclosure agreements and confidentiality obligations"
      icon={Lock}
      color="#DC2626"
      category="Customer & Contract Compliance"
      features={[
        { title: 'NDA List', description: 'List all NDAs' },
        { title: 'Parties', description: 'Document parties involved' },
        { title: 'Scope', description: 'Track confidentiality scope' },
        { title: 'Expiration', description: 'Monitor NDA expiration' },
        { title: 'Obligations', description: 'Document specific obligations' },
      ]}
    />
  );
}
