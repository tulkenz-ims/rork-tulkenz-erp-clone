import { User } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function HairnetIssuanceScreen() {
  return (
    <SanitationPlaceholder
      title="Hairnet Issuance Log"
      description="Track hairnet distribution to employees"
      icon={User}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Employee Tracking', description: 'Log employee receiving hairnet' },
        { title: 'Quantity', description: 'Number issued' },
        { title: 'Department', description: 'Work area assignment' },
        { title: 'Shift', description: 'Issuance by shift' },
        { title: 'Compliance Check', description: 'Verify proper use' },
      ]}
    />
  );
}
