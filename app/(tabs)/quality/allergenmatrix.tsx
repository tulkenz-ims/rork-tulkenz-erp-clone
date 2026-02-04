import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Grid3X3 } from 'lucide-react-native';

export default function AllergenMatrixScreen() {
  return (
    <QualityPlaceholder
      title="Allergen Matrix"
      description="Manage product allergen matrix"
      icon={Grid3X3}
      color="#EF4444"
      category="Allergen Management"
      features={[
        { title: 'Product List', description: 'All products in matrix' },
        { title: 'Allergen List', description: 'Big 9 and other allergens' },
        { title: 'Contains/May Contain', description: 'Status for each combination' },
        { title: 'Line Assignment', description: 'Production line allergen status' },
        { title: 'Update History', description: 'Track matrix changes' },
      ]}
    />
  );
}
