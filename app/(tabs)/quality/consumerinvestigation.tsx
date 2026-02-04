import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Search } from 'lucide-react-native';

export default function ConsumerInvestigationScreen() {
  return (
    <QualityPlaceholder
      title="Consumer Complaint Investigation"
      description="Investigate consumer complaints in detail"
      icon={Search}
      color="#6366F1"
      category="Recall & Crisis"
      features={[
        { title: 'Complaint Details', description: 'Consumer and complaint info' },
        { title: 'Product Sample', description: 'Request retained sample' },
        { title: 'Investigation', description: 'Document findings' },
        { title: 'Root Cause', description: 'Determine root cause' },
        { title: 'Response', description: 'Consumer response' },
      ]}
    />
  );
}
