import { Sparkles } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function DeepCleanScreen() {
  return (
    <SanitationPlaceholder
      title="Deep Clean Schedule"
      description="Quarterly and annual deep cleaning schedule for thorough facility sanitation"
      icon={Sparkles}
      color="#8B5CF6"
      category="Master Sanitation Scheduling"
      features={[
        { title: 'Quarterly Schedule', description: 'Deep cleaning tasks performed quarterly' },
        { title: 'Annual Schedule', description: 'Comprehensive annual deep clean planning' },
        { title: 'Area Prioritization', description: 'Priority areas for intensive cleaning' },
        { title: 'Resource Planning', description: 'Equipment and supply requirements' },
        { title: 'Documentation', description: 'Before/after documentation and sign-off' },
      ]}
    />
  );
}
