import { Square } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function RagIssuanceScreen() {
  return (
    <SanitationPlaceholder
      title="Rag Issuance Log"
      description="Track rag distribution to crews"
      icon={Square}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Issue Log', description: 'Track rag distribution' },
        { title: 'Crew Assignment', description: 'Crew receiving rags' },
        { title: 'Color/Type', description: 'Rag type issued' },
        { title: 'Quantity', description: 'Number issued' },
        { title: 'Return Tracking', description: 'Track soiled returns' },
      ]}
    />
  );
}
