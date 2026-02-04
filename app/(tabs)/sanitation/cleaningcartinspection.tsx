import { ShoppingCart } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function CleaningCartInspectionScreen() {
  return (
    <SanitationPlaceholder
      title="Cleaning Cart Inspection"
      description="Regular inspection of cleaning carts and supplies"
      icon={ShoppingCart}
      color="#EF4444"
      category="Sanitation Tools & Equipment"
      features={[
        { title: 'Cart ID', description: 'Identify cart inspected' },
        { title: 'Supply Check', description: 'Verify cart is stocked' },
        { title: 'Cleanliness', description: 'Cart cleanliness assessment' },
        { title: 'Wheel Condition', description: 'Check wheels and mobility' },
        { title: 'Organization', description: 'Proper organization verification' },
      ]}
    />
  );
}
