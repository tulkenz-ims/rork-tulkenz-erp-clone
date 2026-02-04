import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { CheckSquare } from 'lucide-react-native';

export default function CARCloseOutScreen() {
  return (
    <CompliancePlaceholder
      title="CAR Close-Out Verification"
      description="Verify and close corrective action requests from audits"
      icon={CheckSquare}
      color="#10B981"
      category="SQF / GFSI Certification"
      features={[
        { title: 'CAR Reference', description: 'Link to original CAR' },
        { title: 'Action Verification', description: 'Verify corrective action completion' },
        { title: 'Effectiveness Check', description: 'Confirm action effectiveness' },
        { title: 'Evidence Review', description: 'Review supporting documentation' },
        { title: 'Close-Out Approval', description: 'Document approval to close CAR' },
      ]}
    />
  );
}
