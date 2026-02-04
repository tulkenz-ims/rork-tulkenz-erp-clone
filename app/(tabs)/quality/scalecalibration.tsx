import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Scale } from 'lucide-react-native';

export default function ScaleCalibrationScreen() {
  return (
    <QualityPlaceholder
      title="Scale Calibration Check"
      description="Verify scale accuracy with certified test weights"
      icon={Scale}
      color="#14B8A6"
      category="Daily Monitoring"
      features={[
        { title: 'Scale Identification', description: 'Select scale to verify' },
        { title: 'Test Weight Selection', description: 'Choose certified test weight' },
        { title: 'Reading Documentation', description: 'Record actual vs expected' },
        { title: 'Tolerance Verification', description: 'Check within acceptable range' },
        { title: 'Calibration Due Date', description: 'Track next calibration date' },
      ]}
    />
  );
}
