import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Settings } from 'lucide-react-native';

export default function EquipmentReadinessScreen() {
  return (
    <QualityPlaceholder
      title="Equipment Readiness Check"
      description="Verify equipment is ready for production"
      icon={Settings}
      color="#F59E0B"
      category="Pre-Operational"
      features={[
        { title: 'Equipment Selection', description: 'Select equipment to verify' },
        { title: 'Functionality Check', description: 'Verify operational status' },
        { title: 'Calibration Status', description: 'Confirm calibration current' },
        { title: 'Safety Checks', description: 'Verify safety devices functional' },
        { title: 'Readiness Sign-off', description: 'Operator/supervisor approval' },
      ]}
    />
  );
}
