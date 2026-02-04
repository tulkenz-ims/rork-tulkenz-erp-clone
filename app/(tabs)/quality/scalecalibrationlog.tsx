import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Scale } from 'lucide-react-native';

export default function ScaleCalibrationLogScreen() {
  return (
    <QualityPlaceholder
      title="Scale Calibration Log"
      description="Document scale calibration records"
      icon={Scale}
      color="#10B981"
      category="Calibration & Verification"
      features={[
        { title: 'Scale ID', description: 'Select scale to calibrate' },
        { title: 'Test Weights', description: 'Certified weights used' },
        { title: 'Test Points', description: 'Multiple weight points' },
        { title: 'Results', description: 'Actual vs expected readings' },
        { title: 'Next Due Date', description: 'Schedule next calibration' },
      ]}
    />
  );
}
