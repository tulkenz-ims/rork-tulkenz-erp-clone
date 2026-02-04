import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { Globe } from 'lucide-react-native';

export default function VendorPortalScreen() {
  return (
    <ProcurementPlaceholder
      title="Vendor Portal"
      description="Self-service portal for vendor collaboration"
      icon={Globe}
      color="#EC4899"
      category="Vendor Management"
      features={[
        { title: 'PO Visibility', description: 'Vendors view and acknowledge POs' },
        { title: 'Document Upload', description: 'Vendors submit required documents' },
        { title: 'Invoice Submission', description: 'Vendors submit invoices online' },
        { title: 'Profile Updates', description: 'Vendors maintain their own profiles' },
        { title: 'Communication Hub', description: 'Two-way messaging with buyers' },
      ]}
    />
  );
}
