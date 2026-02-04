import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Search } from 'lucide-react-native';

export default function MetalDetectorCalibrationScreen() {
  return (
    <QualityPlaceholder
      title="Metal Detector Calibration Log"
      description="Document metal detector calibration"
      icon={Search}
      color="#8B5CF6"
      category="Calibration & Verification"
      features={[
        { title: 'Detector ID', description: 'Select metal detector' },
        { title: 'Test Pieces', description: 'Fe, Non-Fe, SS standards' },
        { title: 'Sensitivity Settings', description: 'Current sensitivity levels' },
        { title: 'Detection Results', description: 'Pass/fail for each type' },
        { title: 'Calibration Certificate', description: 'Link to certificate' },
      ]}
    />
  );
}
