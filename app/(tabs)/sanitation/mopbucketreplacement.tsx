import { Droplets } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function MopBucketReplacementScreen() {
  return (
    <SanitationPlaceholder
      title="Mop/Bucket Replacement Log"
      description="Track mop head and bucket replacements"
      icon={Droplets}
      color="#EF4444"
      category="Sanitation Tools & Equipment"
      features={[
        { title: 'Replacement Log', description: 'Track all replacements' },
        { title: 'Mop Type', description: 'Type of mop replaced' },
        { title: 'Reason', description: 'Reason for replacement' },
        { title: 'Cost', description: 'Replacement cost tracking' },
        { title: 'Schedule', description: 'Planned replacement schedule' },
      ]}
    />
  );
}
