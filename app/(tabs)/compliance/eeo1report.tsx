import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { BarChart3 } from 'lucide-react-native';

export default function EEO1ReportScreen() {
  return (
    <CompliancePlaceholder
      title="EEO-1 Report Documentation"
      description="Track EEO-1 Component 1 report submission and data"
      icon={BarChart3}
      color="#8B5CF6"
      category="Labor / Employment Compliance"
      features={[
        { title: 'Workforce Data', description: 'Compile workforce demographics' },
        { title: 'Job Categories', description: 'Categorize positions per EEO' },
        { title: 'Submission Records', description: 'Track report submissions' },
        { title: 'Historical Data', description: 'Maintain historical reports' },
        { title: 'Certification', description: 'Document report certification' },
      ]}
    />
  );
}
