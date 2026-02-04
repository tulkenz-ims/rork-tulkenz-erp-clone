import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { FileOutput } from 'lucide-react-native';

export default function ExportCertScreen() {
  return (
    <CompliancePlaceholder
      title="Export Certificate Request"
      description="Track export certificate requests and issuance"
      icon={FileOutput}
      color="#8B5CF6"
      category="Import / Export Compliance"
      features={[
        { title: 'Certificate Requests', description: 'Track certificate requests' },
        { title: 'Destination Country', description: 'Document export destination' },
        { title: 'Product Information', description: 'List products for export' },
        { title: 'Issuing Agency', description: 'Track certifying agency' },
        { title: 'Certificate Status', description: 'Monitor issuance status' },
      ]}
    />
  );
}
