import QualityPlaceholder from '@/components/QualityPlaceholder';
import { FileCheck } from 'lucide-react-native';

export default function DocReviewApprovalScreen() {
  return (
    <QualityPlaceholder
      title="Document Review/Approval Form"
      description="Review and approve document revisions"
      icon={FileCheck}
      color="#10B981"
      category="Document Control"
      features={[
        { title: 'Document Details', description: 'Document ID and version' },
        { title: 'Review Comments', description: 'Reviewer feedback' },
        { title: 'Approval Decision', description: 'Approve or reject' },
        { title: 'Signatures', description: 'Required approval signatures' },
        { title: 'Effective Date', description: 'When revision is effective' },
      ]}
    />
  );
}
