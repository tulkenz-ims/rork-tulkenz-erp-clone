import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Calendar } from 'lucide-react-native';

export default function AnnualProgramReviewScreen() {
  return (
    <CompliancePlaceholder
      title="Annual Program Review Checklist"
      description="Annual review of all OSHA compliance programs"
      icon={Calendar}
      color="#3B82F6"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Program List', description: 'List all required safety programs' },
        { title: 'Review Schedule', description: 'Track annual review dates' },
        { title: 'Findings', description: 'Document review findings' },
        { title: 'Updates Required', description: 'Identify program updates needed' },
        { title: 'Completion Sign-Off', description: 'Document review completion' },
      ]}
    />
  );
}
