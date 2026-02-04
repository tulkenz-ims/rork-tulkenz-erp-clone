import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Moon } from 'lucide-react-native';

export default function HalalCertScreen() {
  return (
    <CompliancePlaceholder
      title="Halal Certification Letter"
      description="Track halal certification and compliance documentation"
      icon={Moon}
      color="#10B981"
      category="Third-Party Certifications"
      features={[
        { title: 'Certificate', description: 'Store halal certificate' },
        { title: 'Certifying Body', description: 'Document halal authority' },
        { title: 'Product Scope', description: 'List certified products' },
        { title: 'Symbol Usage', description: 'Track logo authorization' },
        { title: 'Expiration', description: 'Monitor renewal dates' },
      ]}
    />
  );
}
