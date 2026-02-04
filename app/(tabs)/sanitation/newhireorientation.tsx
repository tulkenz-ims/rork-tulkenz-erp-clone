import { UserPlus } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function NewHireOrientationScreen() {
  return (
    <SanitationPlaceholder
      title="New Hire Sanitation Orientation"
      description="Orientation checklist for new sanitation employees"
      icon={UserPlus}
      color="#A855F7"
      category="Training & Personnel"
      features={[
        { title: 'Facility Tour', description: 'Tour of cleaning areas' },
        { title: 'Equipment Training', description: 'Equipment operation training' },
        { title: 'Chemical Training', description: 'Chemical safety overview' },
        { title: 'Policy Review', description: 'Review sanitation policies' },
        { title: 'Completion Sign-off', description: 'Orientation completion' },
      ]}
    />
  );
}
