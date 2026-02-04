import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { Shield } from 'lucide-react-native';

export default function VendorComplianceScreen() {
  return (
    <ProcurementPlaceholder
      title="Vendor Compliance"
      description="Track vendor compliance with requirements and certifications"
      icon={Shield}
      color="#14B8A6"
      category="Vendor Management"
      features={[
        { title: 'W-9 Tracking', description: 'Track W-9 collection and updates' },
        { title: 'Insurance Tracking', description: 'Monitor COI expiration dates' },
        { title: 'Certification Tracking', description: 'Track vendor certifications' },
        { title: 'Expiration Alerts', description: 'Get alerts before documents expire' },
        { title: 'Compliance Reports', description: 'Generate compliance status reports' },
      ]}
    />
  );
}
