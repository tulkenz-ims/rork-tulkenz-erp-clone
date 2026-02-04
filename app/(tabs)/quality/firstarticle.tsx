import QualityPlaceholder from '@/components/QualityPlaceholder';
import { FileCheck } from 'lucide-react-native';

export default function FirstArticleScreen() {
  return (
    <QualityPlaceholder
      title="First Article Inspection"
      description="Inspect and approve first production articles"
      icon={FileCheck}
      color="#10B981"
      category="In-Process Quality"
      features={[
        { title: 'Product Identification', description: 'Select product and batch' },
        { title: 'Specification Review', description: 'Display product specifications' },
        { title: 'Measurement Recording', description: 'Enter inspection measurements' },
        { title: 'Visual Inspection', description: 'Document appearance check' },
        { title: 'Approval/Rejection', description: 'First article disposition' },
      ]}
    />
  );
}
