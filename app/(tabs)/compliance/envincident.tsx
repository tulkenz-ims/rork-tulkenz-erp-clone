import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { AlertOctagon } from 'lucide-react-native';

export default function EnvIncidentScreen() {
  return (
    <CompliancePlaceholder
      title="Environmental Incident Report"
      description="Document environmental incidents and regulatory notifications"
      icon={AlertOctagon}
      color="#DC2626"
      category="Environmental Compliance (EPA)"
      features={[
        { title: 'Incident Description', description: 'Document incident details' },
        { title: 'Release Quantity', description: 'Record release amounts' },
        { title: 'Notifications', description: 'Track regulatory notifications made' },
        { title: 'Response Actions', description: 'Document cleanup and response' },
        { title: 'Root Cause', description: 'Identify incident root cause' },
      ]}
    />
  );
}
