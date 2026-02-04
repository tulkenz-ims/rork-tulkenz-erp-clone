import { Square } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function WindowCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Window Cleaning Schedule"
      description="Schedule for interior and exterior window cleaning"
      icon={Square}
      color="#0EA5E9"
      category="Window & Glass Cleaning"
      features={[
        { title: 'Interior Windows', description: 'Interior window cleaning schedule' },
        { title: 'Exterior Windows', description: 'Exterior window cleaning schedule' },
        { title: 'High Windows', description: 'Schedule for hard-to-reach windows' },
        { title: 'Contractor Service', description: 'Track window cleaning contractors' },
        { title: 'Completion Log', description: 'Document completed cleanings' },
      ]}
    />
  );
}
