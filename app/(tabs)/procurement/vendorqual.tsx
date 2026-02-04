import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { Award } from 'lucide-react-native';

export default function VendorQualScreen() {
  return (
    <ProcurementPlaceholder
      title="Vendor Qualification"
      description="Qualify and assess vendor capabilities"
      icon={Award}
      color="#F59E0B"
      category="Vendor Management"
      features={[
        { title: 'Qualification Criteria', description: 'Define vendor qualification standards' },
        { title: 'Assessment Forms', description: 'Create vendor assessment questionnaires' },
        { title: 'Site Audits', description: 'Schedule and track vendor audits' },
        { title: 'Capability Tracking', description: 'Document vendor capabilities' },
        { title: 'Requalification', description: 'Manage periodic requalification' },
      ]}
    />
  );
}
