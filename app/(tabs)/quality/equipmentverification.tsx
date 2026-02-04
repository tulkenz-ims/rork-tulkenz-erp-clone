import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Settings } from 'lucide-react-native';

export default function EquipmentVerificationScreen() {
  return (
    <QualityPlaceholder
      title="Equipment Verification Log"
      description="Document equipment verification and validation"
      icon={Settings}
      color="#F59E0B"
      category="Calibration & Verification"
      features={[
        { title: 'Equipment ID', description: 'Select equipment to verify' },
        { title: 'Verification Type', description: 'Type of verification performed' },
        { title: 'Test Procedure', description: 'Verification method used' },
        { title: 'Results', description: 'Document verification results' },
        { title: 'Next Due Date', description: 'Schedule next verification' },
      ]}
    />
  );
}
