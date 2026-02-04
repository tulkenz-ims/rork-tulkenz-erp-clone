import QualityPlaceholder from '@/components/QualityPlaceholder';
import { CheckSquare } from 'lucide-react-native';

export default function AllergenChangeChecklistScreen() {
  return (
    <QualityPlaceholder
      title="Allergen Changeover Checklist"
      description="Checklist for allergen changeover procedures"
      icon={CheckSquare}
      color="#F59E0B"
      category="Allergen Management"
      features={[
        { title: 'Previous Allergen', description: 'Allergen from prior production' },
        { title: 'Cleaning Steps', description: 'Required cleaning checklist' },
        { title: 'Visual Inspection', description: 'Verify cleanliness' },
        { title: 'Verification Testing', description: 'ATP or allergen test' },
        { title: 'Sign-off', description: 'QA approval for changeover' },
      ]}
    />
  );
}
