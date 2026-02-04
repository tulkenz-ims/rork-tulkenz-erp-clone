import QualityPlaceholder from '@/components/QualityPlaceholder';
import { CheckCircle } from 'lucide-react-native';

export default function HoldReleaseScreen() {
  return (
    <QualityPlaceholder
      title="Hold Release Authorization"
      description="Authorize release of products from quality hold"
      icon={CheckCircle}
      color="#10B981"
      category="Hold & Release"
      features={[
        { title: 'Hold Reference', description: 'Link to original hold tag' },
        { title: 'Investigation Summary', description: 'Summary of findings' },
        { title: 'Test Results', description: 'Link to any testing performed' },
        { title: 'Release Decision', description: 'Approve release or reject' },
        { title: 'Release Authorization', description: 'QA signature for release' },
      ]}
    />
  );
}
