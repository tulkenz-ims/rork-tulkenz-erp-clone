import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Droplets } from 'lucide-react-native';

export default function HandwashingLogScreen() {
  return (
    <QualityPlaceholder
      title="Handwashing Verification Log"
      description="Verify and document handwashing compliance"
      icon={Droplets}
      color="#06B6D4"
      category="GMP & Hygiene"
      features={[
        { title: 'Station', description: 'Handwash station location' },
        { title: 'Observations', description: 'Employees observed' },
        { title: 'Compliance Check', description: 'Proper technique used' },
        { title: 'Supplies Check', description: 'Soap, towels available' },
        { title: 'Coaching Notes', description: 'Document any coaching' },
      ]}
    />
  );
}
