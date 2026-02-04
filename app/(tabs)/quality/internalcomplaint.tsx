import QualityPlaceholder from '@/components/QualityPlaceholder';
import { MessageCircle } from 'lucide-react-native';

export default function InternalComplaintScreen() {
  return (
    <QualityPlaceholder
      title="Internal Complaint Form"
      description="Document internal quality complaints between departments"
      icon={MessageCircle}
      color="#6366F1"
      category="Non-Conformance"
      features={[
        { title: 'Originating Department', description: 'Department filing complaint' },
        { title: 'Receiving Department', description: 'Department responsible' },
        { title: 'Issue Description', description: 'Detail the quality issue' },
        { title: 'Investigation', description: 'Document findings' },
        { title: 'Resolution', description: 'Document corrective action taken' },
      ]}
    />
  );
}
