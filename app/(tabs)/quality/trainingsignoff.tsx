import QualityPlaceholder from '@/components/QualityPlaceholder';
import { GraduationCap } from 'lucide-react-native';

export default function TrainingSignOffScreen() {
  return (
    <QualityPlaceholder
      title="Training Record Sign-Off"
      description="Document training completion and acknowledgment"
      icon={GraduationCap}
      color="#14B8A6"
      category="Document Control"
      features={[
        { title: 'Document/SOP', description: 'Document trained on' },
        { title: 'Trainee List', description: 'Employees trained' },
        { title: 'Training Date', description: 'When training occurred' },
        { title: 'Trainer', description: 'Who provided training' },
        { title: 'Signatures', description: 'Trainee acknowledgment' },
      ]}
    />
  );
}
