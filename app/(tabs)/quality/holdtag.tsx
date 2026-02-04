import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Ban } from 'lucide-react-native';

export default function HoldTagScreen() {
  return (
    <QualityPlaceholder
      title="Quality Hold Tag/Form"
      description="Place products on quality hold"
      icon={Ban}
      color="#EF4444"
      category="Hold & Release"
      features={[
        { title: 'Product Details', description: 'Product, lot, quantity' },
        { title: 'Hold Reason', description: 'Document reason for hold' },
        { title: 'Hold Location', description: 'Physical location of held product' },
        { title: 'Hold Date/Time', description: 'When hold was initiated' },
        { title: 'Hold Initiated By', description: 'Person placing hold' },
        { title: 'Investigation Status', description: 'Track investigation progress' },
      ]}
    />
  );
}
