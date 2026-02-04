import { Footprints } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function ShoeCoverIssuanceScreen() {
  return (
    <SanitationPlaceholder
      title="Shoe/Boot Cover Issuance"
      description="Track shoe cover distribution"
      icon={Footprints}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Employee ID', description: 'Track recipient' },
        { title: 'Quantity', description: 'Pairs issued' },
        { title: 'Area Entry', description: 'Area requiring covers' },
        { title: 'Date/Time', description: 'Issuance timestamp' },
        { title: 'Disposal', description: 'Proper disposal verification' },
      ]}
    />
  );
}
