import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Package } from 'lucide-react-native';

export default function IngredientReceivingScreen() {
  return (
    <QualityPlaceholder
      title="Ingredient Receiving Log"
      description="Log ingredient receipts with quality verification"
      icon={Package}
      color="#10B981"
      category="Receiving & Supplier"
      features={[
        { title: 'Ingredient Selection', description: 'Select ingredient received' },
        { title: 'Supplier/Lot Info', description: 'Record supplier and lot number' },
        { title: 'Quantity Verification', description: 'Verify quantity received' },
        { title: 'Temperature Check', description: 'Record receiving temperature' },
        { title: 'Storage Assignment', description: 'Assign storage location' },
      ]}
    />
  );
}
