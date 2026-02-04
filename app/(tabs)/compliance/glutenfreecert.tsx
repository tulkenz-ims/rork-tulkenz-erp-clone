import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Wheat } from 'lucide-react-native';

export default function GlutenFreeCertScreen() {
  return (
    <CompliancePlaceholder
      title="Gluten-Free Certification"
      description="Track gluten-free certification and testing records"
      icon={Wheat}
      color="#8B5CF6"
      category="Third-Party Certifications"
      features={[
        { title: 'Certificate', description: 'Store GF certificate' },
        { title: 'Certifying Organization', description: 'Document certifier' },
        { title: 'Product List', description: 'List certified products' },
        { title: 'Testing Records', description: 'Track gluten testing' },
        { title: 'Renewal', description: 'Monitor certification renewal' },
      ]}
    />
  );
}
