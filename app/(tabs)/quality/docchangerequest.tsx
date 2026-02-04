import QualityPlaceholder from '@/components/QualityPlaceholder';
import { FileEdit } from 'lucide-react-native';

export default function DocChangeRequestScreen() {
  return (
    <QualityPlaceholder
      title="Document Change Request"
      description="Request changes to controlled documents"
      icon={FileEdit}
      color="#3B82F6"
      category="Document Control"
      features={[
        { title: 'Document ID', description: 'Select document to change' },
        { title: 'Change Description', description: 'Describe requested change' },
        { title: 'Justification', description: 'Reason for change' },
        { title: 'Impact Assessment', description: 'Evaluate change impact' },
        { title: 'Approval Routing', description: 'Required approvals' },
      ]}
    />
  );
}
