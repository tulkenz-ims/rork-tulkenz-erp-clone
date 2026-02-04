import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Microscope } from 'lucide-react-native';

export default function MicroTestScreen() {
  return (
    <QualityPlaceholder
      title="Micro Testing Request"
      description="Request and track microbiological testing"
      icon={Microscope}
      color="#10B981"
      category="Testing & Laboratory"
      features={[
        { title: 'Sample Details', description: 'Product, lot, sample ID' },
        { title: 'Test Type', description: 'Select micro tests required' },
        { title: 'Sampling Info', description: 'Date, time, sampler' },
        { title: 'Lab Assignment', description: 'Internal or external lab' },
        { title: 'Results Entry', description: 'Record test results' },
      ]}
    />
  );
}
