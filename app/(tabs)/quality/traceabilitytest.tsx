import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Search } from 'lucide-react-native';

export default function TraceabilityTestScreen() {
  return (
    <QualityPlaceholder
      title="Traceability Test Results"
      description="Document traceability test outcomes"
      icon={Search}
      color="#6366F1"
      category="Traceability"
      features={[
        { title: 'Test Type', description: 'Forward or backward trace' },
        { title: 'Starting Point', description: 'Lot or ingredient to trace' },
        { title: 'Trace Results', description: 'Document what was found' },
        { title: 'Time to Complete', description: 'Duration of trace' },
        { title: 'Completeness', description: 'Percentage successfully traced' },
      ]}
    />
  );
}
