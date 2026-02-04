import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { FileCheck } from 'lucide-react-native';

export default function FSVPProgramScreen() {
  return (
    <CompliancePlaceholder
      title="FSVP Program"
      description="Foreign Supplier Verification Program documentation"
      icon={FileCheck}
      color="#6366F1"
      category="Import / Export Compliance"
      features={[
        { title: 'Program Documentation', description: 'Store FSVP procedures' },
        { title: 'Importer Identification', description: 'Document importer of record' },
        { title: 'Qualified Individual', description: 'Identify qualified individual' },
        { title: 'Supplier List', description: 'Track foreign suppliers' },
        { title: 'Verification Activities', description: 'Document verification plans' },
      ]}
    />
  );
}
