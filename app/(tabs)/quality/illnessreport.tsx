import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Heart } from 'lucide-react-native';

export default function IllnessReportScreen() {
  return (
    <QualityPlaceholder
      title="Illness/Injury Reporting Form"
      description="Document employee illness and injury reports"
      icon={Heart}
      color="#EF4444"
      category="GMP & Hygiene"
      features={[
        { title: 'Employee Info', description: 'Employee details' },
        { title: 'Illness/Injury Type', description: 'Nature of condition' },
        { title: 'Symptoms', description: 'Document symptoms' },
        { title: 'Work Restriction', description: 'Assign work restrictions' },
        { title: 'Return to Work', description: 'Clearance documentation' },
      ]}
    />
  );
}
