import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Eye } from 'lucide-react-native';

export default function VisualInspectionScreen() {
  return (
    <QualityPlaceholder
      title="Product Appearance/Visual Inspection"
      description="Document visual quality inspection of products"
      icon={Eye}
      color="#6366F1"
      category="Daily Monitoring"
      features={[
        { title: 'Product Selection', description: 'Select product to inspect' },
        { title: 'Visual Criteria', description: 'Checklist of appearance standards' },
        { title: 'Defect Documentation', description: 'Record any visual defects' },
        { title: 'Photo Capture', description: 'Attach photos of defects' },
        { title: 'Accept/Reject Decision', description: 'Document disposition' },
      ]}
    />
  );
}
