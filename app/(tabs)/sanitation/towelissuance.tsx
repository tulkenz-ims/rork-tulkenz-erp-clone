import { Square } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function TowelIssuanceScreen() {
  return (
    <SanitationPlaceholder
      title="Towel Issuance Log"
      description="Track towel distribution to areas/employees"
      icon={Square}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Issue Log', description: 'Track towel distribution' },
        { title: 'Area Assignment', description: 'Area receiving towels' },
        { title: 'Quantity', description: 'Number issued' },
        { title: 'Return Tracking', description: 'Track towel returns' },
        { title: 'Loss Tracking', description: 'Monitor missing towels' },
      ]}
    />
  );
}
