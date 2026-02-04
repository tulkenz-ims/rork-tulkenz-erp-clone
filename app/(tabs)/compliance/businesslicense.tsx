import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Building2 } from 'lucide-react-native';

export default function BusinessLicenseScreen() {
  return (
    <CompliancePlaceholder
      title="Business License Renewal"
      description="Track business license renewals and compliance"
      icon={Building2}
      color="#6366F1"
      category="State & Local Permits"
      features={[
        { title: 'License Number', description: 'Document license identification' },
        { title: 'Issue Date', description: 'Record license issue date' },
        { title: 'Expiration Date', description: 'Track renewal deadlines' },
        { title: 'Fees Paid', description: 'Document fee payments' },
        { title: 'Renewal Status', description: 'Monitor renewal status' },
      ]}
    />
  );
}
