import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { GraduationCap } from 'lucide-react-native';

export default function FoodDefenseTrainingScreen() {
  return (
    <CompliancePlaceholder
      title="Food Defense Training Log"
      description="Track food defense training for personnel"
      icon={GraduationCap}
      color="#0EA5E9"
      category="Food Defense (FSMA IA)"
      features={[
        { title: 'Training Records', description: 'Document training completion' },
        { title: 'Training Content', description: 'Track topics covered' },
        { title: 'Personnel List', description: 'List trained employees' },
        { title: 'Refresher Training', description: 'Monitor refresher schedules' },
        { title: 'Competency', description: 'Verify training effectiveness' },
      ]}
    />
  );
}
