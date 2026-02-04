import QualityPlaceholder from '@/components/QualityPlaceholder';
import { AlertOctagon } from 'lucide-react-native';

export default function ForeignMaterialLogScreen() {
  return (
    <QualityPlaceholder
      title="Foreign Material Check Log"
      description="Document foreign material inspections and findings"
      icon={AlertOctagon}
      color="#EF4444"
      category="In-Process Quality"
      features={[
        { title: 'Inspection Point', description: 'Select inspection location' },
        { title: 'Detection Method', description: 'Visual, metal detector, x-ray, etc.' },
        { title: 'Finding Documentation', description: 'Record any foreign material found' },
        { title: 'Photo Attachment', description: 'Attach photos of findings' },
        { title: 'Corrective Action', description: 'Document response actions' },
      ]}
    />
  );
}
