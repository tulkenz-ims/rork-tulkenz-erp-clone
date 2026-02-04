import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { FileSpreadsheet } from 'lucide-react-native';

export default function TierIIReportScreen() {
  return (
    <CompliancePlaceholder
      title="Tier II Chemical Inventory Report"
      description="Track annual Tier II hazardous chemical inventory reporting"
      icon={FileSpreadsheet}
      color="#8B5CF6"
      category="Environmental Compliance (EPA)"
      features={[
        { title: 'Chemical Inventory', description: 'List reportable chemicals' },
        { title: 'Storage Locations', description: 'Document chemical storage areas' },
        { title: 'Quantity Ranges', description: 'Report daily max and average quantities' },
        { title: 'Submission Records', description: 'Track report submissions' },
        { title: 'SDS Availability', description: 'Verify SDS availability for chemicals' },
      ]}
    />
  );
}
