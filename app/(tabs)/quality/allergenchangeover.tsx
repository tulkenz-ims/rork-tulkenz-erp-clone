import QualityPlaceholder from '@/components/QualityPlaceholder';
import { AlertTriangle } from 'lucide-react-native';

export default function AllergenChangeoverScreen() {
  return (
    <QualityPlaceholder
      title="Allergen Changeover Verification"
      description="Document allergen changeover cleaning verification"
      icon={AlertTriangle}
      color="#EF4444"
      category="Pre-Operational"
      features={[
        { title: 'Previous Product', description: 'Identify allergens from prior run' },
        { title: 'Next Product', description: 'Identify allergens in upcoming run' },
        { title: 'Cleaning Steps', description: 'Document cleaning procedure followed' },
        { title: 'Verification Testing', description: 'Record allergen swab results' },
        { title: 'Release Approval', description: 'QA sign-off for changeover' },
      ]}
    />
  );
}
