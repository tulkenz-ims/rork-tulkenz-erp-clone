import QualityPlaceholder from '@/components/QualityPlaceholder';
import { MessageSquare } from 'lucide-react-native';

export default function CrisisCommLogScreen() {
  return (
    <QualityPlaceholder
      title="Crisis Communication Log"
      description="Log crisis communications and actions"
      icon={MessageSquare}
      color="#EF4444"
      category="Recall & Crisis"
      features={[
        { title: 'Crisis Event', description: 'Link to crisis/recall' },
        { title: 'Communications', description: 'All communications sent' },
        { title: 'Recipients', description: 'Who was contacted' },
        { title: 'Timeline', description: 'Communication timeline' },
        { title: 'Media', description: 'Media contact log' },
      ]}
    />
  );
}
