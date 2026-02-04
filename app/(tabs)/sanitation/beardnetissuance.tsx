import { User } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function BeardNetIssuanceScreen() {
  return (
    <SanitationPlaceholder
      title="Beard Net Issuance"
      description="Track beard net distribution to employees"
      icon={User}
      color="#F97316"
      category="Production Consumable Supplies"
      features={[
        { title: 'Employee Log', description: 'Track who received beard net' },
        { title: 'Quantity Issued', description: 'Number provided' },
        { title: 'Date/Time', description: 'Issuance timestamp' },
        { title: 'Compliance', description: 'Verify requirement met' },
        { title: 'Notes', description: 'Additional observations' },
      ]}
    />
  );
}
