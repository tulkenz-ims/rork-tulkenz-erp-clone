import { GraduationCap } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function SanitationTrainingScreen() {
  return (
    <SanitationPlaceholder
      title="Sanitation Training Sign-In"
      description="Sign-in sheet for sanitation training sessions"
      icon={GraduationCap}
      color="#A855F7"
      category="Training & Personnel"
      features={[
        { title: 'Training Topic', description: 'Subject of training' },
        { title: 'Attendees', description: 'List of participants' },
        { title: 'Trainer', description: 'Training instructor' },
        { title: 'Date/Duration', description: 'Training date and length' },
        { title: 'Sign-off', description: 'Attendee signatures' },
      ]}
    />
  );
}
