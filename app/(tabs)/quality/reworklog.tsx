import QualityPlaceholder from '@/components/QualityPlaceholder';
import { RotateCcw } from 'lucide-react-native';

export default function ReworkLogScreen() {
  return (
    <QualityPlaceholder
      title="Rework Tracking Log"
      description="Track rework activities and results"
      icon={RotateCcw}
      color="#8B5CF6"
      category="Hold & Release"
      features={[
        { title: 'Rework Reference', description: 'Link to authorization form' },
        { title: 'Start/End Time', description: 'Track rework duration' },
        { title: 'Personnel', description: 'Record who performed rework' },
        { title: 'Quantity Processed', description: 'Track quantities reworked' },
        { title: 'Result Inspection', description: 'Document rework outcome' },
      ]}
    />
  );
}
