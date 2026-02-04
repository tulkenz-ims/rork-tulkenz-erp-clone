import { Eye } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function ADAScreen() {
  return (
    <HRPlaceholder
      title="ADA Accommodations"
      description="Track and manage Americans with Disabilities Act accommodation requests and approvals."
      icon={Eye}
      color="#075985"
      category="HR Compliance & Reporting"
      features={[
        { title: 'Accommodation Requests', description: 'Submit and track requests' },
        { title: 'Interactive Process', description: 'Document discussions' },
        { title: 'Accommodation Types', description: 'Categorize accommodations' },
        { title: 'Approval Workflow', description: 'Review and approve requests' },
        { title: 'Compliance Documentation', description: 'Maintain audit trail' },
      ]}
    />
  );
}
