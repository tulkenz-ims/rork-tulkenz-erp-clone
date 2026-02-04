import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Sprout } from 'lucide-react-native';

export default function NonGMOCertScreen() {
  return (
    <CompliancePlaceholder
      title="Non-GMO Project Verification"
      description="Track Non-GMO Project verification and compliance"
      icon={Sprout}
      color="#F59E0B"
      category="Third-Party Certifications"
      features={[
        { title: 'Verification Letter', description: 'Store verification certificate' },
        { title: 'Product Enrollment', description: 'List verified products' },
        { title: 'Testing Records', description: 'Track testing results' },
        { title: 'Annual Review', description: 'Document annual review' },
        { title: 'Logo Usage', description: 'Track seal authorization' },
      ]}
    />
  );
}
