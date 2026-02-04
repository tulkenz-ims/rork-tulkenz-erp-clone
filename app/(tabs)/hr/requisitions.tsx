import { FileText } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function RequisitionsScreen() {
  return (
    <HRPlaceholder
      title="Job Requisitions"
      description="Create, approve, and track job requisitions for new and replacement positions."
      icon={FileText}
      color="#8B5CF6"
      category="Talent Acquisition"
      features={[
        { title: 'Requisition Creation', description: 'Submit requests for new positions' },
        { title: 'Approval Workflow', description: 'Multi-level authorization' },
        { title: 'Budget Integration', description: 'Link to headcount budget' },
        { title: 'Position Details', description: 'Job requirements and compensation' },
        { title: 'Requisition Status', description: 'Track from request to fill' },
      ]}
    />
  );
}
