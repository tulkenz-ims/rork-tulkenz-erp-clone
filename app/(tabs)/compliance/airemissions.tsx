import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Wind } from 'lucide-react-native';

export default function AirEmissionsScreen() {
  return (
    <CompliancePlaceholder
      title="Air Emissions Permit"
      description="Document air emissions permit and compliance records"
      icon={Wind}
      color="#64748B"
      category="Environmental Compliance (EPA)"
      features={[
        { title: 'Permit Documentation', description: 'Store air permit records' },
        { title: 'Emission Sources', description: 'Track permitted emission sources' },
        { title: 'Emission Limits', description: 'Document permitted emission limits' },
        { title: 'Monitoring Records', description: 'Track emission monitoring data' },
        { title: 'Compliance Reports', description: 'Document annual compliance reports' },
      ]}
    />
  );
}
