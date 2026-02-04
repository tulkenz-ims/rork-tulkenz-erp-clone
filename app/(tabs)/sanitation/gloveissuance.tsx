import { Hand } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function GloveIssuanceScreen() {
  return (
    <SanitationPlaceholder
      title="Glove Issuance Log"
      description="Track glove distribution to employees"
      icon={Hand}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Employee ID', description: 'Track who received gloves' },
        { title: 'Quantity Issued', description: 'Number of gloves issued' },
        { title: 'Size Issued', description: 'Glove size provided' },
        { title: 'Department', description: 'Issuing department' },
        { title: 'Date/Time', description: 'Issuance timestamp' },
      ]}
    />
  );
}
