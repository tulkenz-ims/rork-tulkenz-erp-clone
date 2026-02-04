import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Trash2 } from 'lucide-react-native';

export default function DestructionLogScreen() {
  return (
    <CompliancePlaceholder
      title="Document Destruction Log"
      description="Track authorized document destruction activities"
      icon={Trash2}
      color="#EF4444"
      category="Record Retention & Document Control"
      features={[
        { title: 'Destruction Records', description: 'Log destroyed documents' },
        { title: 'Authorization', description: 'Document destruction approval' },
        { title: 'Method', description: 'Track destruction method' },
        { title: 'Witness', description: 'Document witness if required' },
        { title: 'Certificate', description: 'Store destruction certificates' },
      ]}
    />
  );
}
