import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Bug } from 'lucide-react-native';

export default function PestControlLicenseScreen() {
  return (
    <CompliancePlaceholder
      title="Pest Control License Verification"
      description="Verify pest control provider licensing and compliance"
      icon={Bug}
      color="#10B981"
      category="State & Local Permits"
      features={[
        { title: 'Vendor License', description: 'Verify provider license' },
        { title: 'Applicator Certification', description: 'Track technician certs' },
        { title: 'Insurance Verification', description: 'Document liability coverage' },
        { title: 'Service Contract', description: 'Store service agreement' },
        { title: 'License Renewal', description: 'Monitor license expiration' },
      ]}
    />
  );
}
