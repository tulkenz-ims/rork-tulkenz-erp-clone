import { Sparkles } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function FloorWaxingScreen() {
  return (
    <SanitationPlaceholder
      title="Floor Waxing/Stripping Record"
      description="Documentation for floor stripping and waxing services"
      icon={Sparkles}
      color="#EC4899"
      category="Floor Care"
      features={[
        { title: 'Strip Date', description: 'Date floor was stripped' },
        { title: 'Wax Application', description: 'Number of wax coats applied' },
        { title: 'Product Used', description: 'Wax product information' },
        { title: 'Cure Time', description: 'Document drying/curing time' },
        { title: 'Before/After', description: 'Document condition before and after' },
      ]}
    />
  );
}
