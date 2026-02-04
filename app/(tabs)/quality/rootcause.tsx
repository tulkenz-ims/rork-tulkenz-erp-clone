import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Search } from 'lucide-react-native';

export default function RootCauseScreen() {
  return (
    <QualityPlaceholder
      title="Root Cause Analysis Form"
      description="Document formal root cause analysis"
      icon={Search}
      color="#10B981"
      category="Non-Conformance"
      features={[
        { title: 'Issue Reference', description: 'Link to NCR, complaint, etc.' },
        { title: 'Problem Statement', description: 'Define the problem clearly' },
        { title: 'Data Collection', description: 'Document relevant data' },
        { title: 'Analysis Method', description: 'Fishbone, 5 Whys, etc.' },
        { title: 'Root Cause', description: 'Document determined root cause' },
        { title: 'Recommended Actions', description: 'Propose corrective actions' },
      ]}
    />
  );
}
