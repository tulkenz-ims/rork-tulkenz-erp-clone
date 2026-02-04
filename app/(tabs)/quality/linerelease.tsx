import QualityPlaceholder from '@/components/QualityPlaceholder';
import { PlayCircle } from 'lucide-react-native';

export default function LineReleaseScreen() {
  return (
    <QualityPlaceholder
      title="Line Release Form"
      description="Authorize production line release after verification"
      icon={PlayCircle}
      color="#8B5CF6"
      category="Pre-Operational"
      features={[
        { title: 'Line Selection', description: 'Select production line' },
        { title: 'Pre-Op Status', description: 'Verify pre-op inspection complete' },
        { title: 'Sanitation Status', description: 'Verify sanitation approval' },
        { title: 'Product Setup', description: 'Confirm product parameters' },
        { title: 'Release Authorization', description: 'QA release signature' },
      ]}
    />
  );
}
