import { LayoutGrid } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function CarpetCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Carpet Cleaning/Shampooing"
      description="Log for carpet cleaning and shampooing services"
      icon={LayoutGrid}
      color="#EC4899"
      category="Floor Care"
      features={[
        { title: 'Area Cleaned', description: 'Document carpeted areas cleaned' },
        { title: 'Method Used', description: 'Extraction, bonnet, or shampoo method' },
        { title: 'Spot Treatment', description: 'Note stain treatments applied' },
        { title: 'Dry Time', description: 'Estimated drying time' },
        { title: 'Next Service', description: 'Schedule next carpet cleaning' },
      ]}
    />
  );
}
