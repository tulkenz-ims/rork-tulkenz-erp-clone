import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Star } from 'lucide-react-native';

export default function KosherCertScreen() {
  return (
    <CompliancePlaceholder
      title="Kosher Certification Letter"
      description="Track kosher certification and rabbi supervision"
      icon={Star}
      color="#3B82F6"
      category="Third-Party Certifications"
      features={[
        { title: 'Certificate Letter', description: 'Store kosher certificate' },
        { title: 'Certifying Agency', description: 'Document kosher agency' },
        { title: 'Product List', description: 'List certified products' },
        { title: 'Symbol Authorization', description: 'Track logo usage rights' },
        { title: 'Renewal Date', description: 'Monitor certification renewal' },
      ]}
    />
  );
}
