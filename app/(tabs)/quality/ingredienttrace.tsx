import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Link } from 'lucide-react-native';

export default function IngredientTraceScreen() {
  return (
    <QualityPlaceholder
      title="Ingredient Traceability Log"
      description="Track ingredients used in production"
      icon={Link}
      color="#10B981"
      category="Traceability"
      features={[
        { title: 'Production Batch', description: 'Link to production batch' },
        { title: 'Ingredient List', description: 'All ingredients used' },
        { title: 'Supplier Lots', description: 'Supplier lot numbers' },
        { title: 'Quantities Used', description: 'Amount of each ingredient' },
        { title: 'Timestamp', description: 'When ingredients were used' },
      ]}
    />
  );
}
