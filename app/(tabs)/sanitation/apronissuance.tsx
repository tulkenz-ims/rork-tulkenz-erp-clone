import { Shirt } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function ApronIssuanceScreen() {
  return (
    <SanitationPlaceholder
      title="Apron/Smock Issuance"
      description="Track apron and smock distribution"
      icon={Shirt}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Employee Log', description: 'Track who received apron' },
        { title: 'Size Issued', description: 'Size provided' },
        { title: 'Department', description: 'Work area assignment' },
        { title: 'Return Tracking', description: 'Track returns for laundry' },
        { title: 'Replacement', description: 'Issue replacements as needed' },
      ]}
    />
  );
}
