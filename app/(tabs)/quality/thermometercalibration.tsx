import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Thermometer } from 'lucide-react-native';

export default function ThermometerCalibrationScreen() {
  return (
    <QualityPlaceholder
      title="Thermometer Calibration Log"
      description="Document thermometer calibration verification"
      icon={Thermometer}
      color="#3B82F6"
      category="Calibration & Verification"
      features={[
        { title: 'Thermometer ID', description: 'Select thermometer' },
        { title: 'Reference Standard', description: 'Calibrated reference used' },
        { title: 'Test Points', description: 'Ice point, boiling point' },
        { title: 'Readings', description: 'Record actual vs expected' },
        { title: 'Adjustment', description: 'Document any adjustments' },
      ]}
    />
  );
}
