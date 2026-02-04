import { Maximize2 } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function GlassCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Interior Glass/Mirror Cleaning"
      description="Log for cleaning interior glass surfaces and mirrors"
      icon={Maximize2}
      color="#0EA5E9"
      category="Window & Glass Cleaning"
      features={[
        { title: 'Mirror Cleaning', description: 'Clean restroom and office mirrors' },
        { title: 'Glass Partitions', description: 'Clean glass walls and partitions' },
        { title: 'Display Cases', description: 'Clean glass display cases' },
        { title: 'Streak-Free Check', description: 'Verify streak-free finish' },
        { title: 'Frequency', description: 'Track cleaning frequency' },
      ]}
    />
  );
}
