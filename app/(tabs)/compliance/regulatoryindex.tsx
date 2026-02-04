import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { FileText } from 'lucide-react-native';

export default function RegulatoryIndexScreen() {
  return (
    <CompliancePlaceholder
      title="Regulatory Record Index"
      description="Index of all regulatory records and their locations"
      icon={FileText}
      color="#3B82F6"
      category="Record Retention & Document Control"
      features={[
        { title: 'Record Index', description: 'List all regulatory records' },
        { title: 'Location Mapping', description: 'Document storage locations' },
        { title: 'Responsible Party', description: 'Track record owners' },
        { title: 'Access Controls', description: 'Document access requirements' },
        { title: 'Search Function', description: 'Enable record search' },
      ]}
    />
  );
}
