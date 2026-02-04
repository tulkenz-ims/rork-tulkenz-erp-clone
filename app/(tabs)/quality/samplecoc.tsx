import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Link } from 'lucide-react-native';

export default function SampleCOCScreen() {
  return (
    <QualityPlaceholder
      title="Lab Sample Chain of Custody"
      description="Document sample chain of custody for testing"
      icon={Link}
      color="#8B5CF6"
      category="Testing & Laboratory"
      features={[
        { title: 'Sample ID', description: 'Unique sample identifier' },
        { title: 'Collection Info', description: 'Date, time, collector' },
        { title: 'Transfer Log', description: 'Track custody transfers' },
        { title: 'Lab Receipt', description: 'Lab acknowledgment' },
        { title: 'Condition Record', description: 'Sample condition at each step' },
      ]}
    />
  );
}
