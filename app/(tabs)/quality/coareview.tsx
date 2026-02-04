import QualityPlaceholder from '@/components/QualityPlaceholder';
import { FileText } from 'lucide-react-native';

export default function COAReviewScreen() {
  return (
    <QualityPlaceholder
      title="COA (Certificate of Analysis) Review"
      description="Review and approve supplier Certificates of Analysis"
      icon={FileText}
      color="#6366F1"
      category="Receiving & Supplier"
      features={[
        { title: 'COA Upload', description: 'Attach COA document' },
        { title: 'Specification Match', description: 'Compare to internal specs' },
        { title: 'Parameter Review', description: 'Review test results' },
        { title: 'Compliance Check', description: 'Verify meets requirements' },
        { title: 'Approval/Rejection', description: 'Document COA disposition' },
      ]}
    />
  );
}
