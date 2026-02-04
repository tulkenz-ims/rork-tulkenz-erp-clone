import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Archive } from 'lucide-react-native';

export default function RetainedSampleLogScreen() {
  return (
    <QualityPlaceholder
      title="Retained Sample Log"
      description="Track retained sample storage and disposition"
      icon={Archive}
      color="#EC4899"
      category="Testing & Laboratory"
      features={[
        { title: 'Sample Details', description: 'Product, lot, date' },
        { title: 'Storage Location', description: 'Where sample is stored' },
        { title: 'Retention Period', description: 'Required retention time' },
        { title: 'Condition Checks', description: 'Periodic condition verification' },
        { title: 'Disposition', description: 'Document when disposed' },
      ]}
    />
  );
}
