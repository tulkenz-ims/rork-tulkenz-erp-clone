import { Building2 } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function OfficeCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Office Cleaning Checklist"
      description="Cleaning checklist for office spaces and work areas"
      icon={Building2}
      color="#10B981"
      category="Office & Common Areas"
      features={[
        { title: 'Desk Surfaces', description: 'Clean and sanitize desk surfaces' },
        { title: 'Trash Removal', description: 'Empty office trash cans' },
        { title: 'Vacuum/Sweep', description: 'Floor cleaning' },
        { title: 'Dusting', description: 'Dust surfaces and equipment' },
        { title: 'High-Touch Areas', description: 'Sanitize door handles, light switches' },
      ]}
    />
  );
}
