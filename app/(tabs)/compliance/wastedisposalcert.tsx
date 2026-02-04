import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { FileCheck } from 'lucide-react-native';

export default function WasteDisposalCertScreen() {
  return (
    <CompliancePlaceholder
      title="Waste Disposal Vendor Certification"
      description="Track waste disposal vendor certifications and approvals"
      icon={FileCheck}
      color="#10B981"
      category="Environmental Compliance (EPA)"
      features={[
        { title: 'Vendor Information', description: 'Document disposal vendor details' },
        { title: 'Permit Verification', description: 'Verify vendor permits and licenses' },
        { title: 'Insurance Documentation', description: 'Track vendor insurance certificates' },
        { title: 'Approval Status', description: 'Document vendor approval status' },
        { title: 'Review Schedule', description: 'Track periodic vendor reviews' },
      ]}
    />
  );
}
