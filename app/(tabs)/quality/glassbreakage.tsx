import QualityPlaceholder from '@/components/QualityPlaceholder';
import { AlertTriangle } from 'lucide-react-native';

export default function GlassBreakageScreen() {
  return (
    <QualityPlaceholder
      title="Glass Breakage Report"
      description="Document glass breakage incidents"
      icon={AlertTriangle}
      color="#DC2626"
      category="GMP & Hygiene"
      features={[
        { title: 'Incident Details', description: 'What, where, when' },
        { title: 'Item Description', description: 'Broken item details' },
        { title: 'Containment', description: 'Containment actions taken' },
        { title: 'Product Impact', description: 'Product affected or disposed' },
        { title: 'Root Cause', description: 'Cause of breakage' },
      ]}
    />
  );
}
