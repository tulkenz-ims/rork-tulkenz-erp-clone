import QualityPlaceholder from '@/components/QualityPlaceholder';
import { FileCheck } from 'lucide-react-native';

export default function DispositionScreen() {
  return (
    <QualityPlaceholder
      title="Disposition Form"
      description="Document disposition decision for non-conforming product"
      icon={FileCheck}
      color="#6366F1"
      category="Hold & Release"
      features={[
        { title: 'Product Details', description: 'Product, lot, quantity' },
        { title: 'Non-Conformance', description: 'Link to NCR or issue' },
        { title: 'Disposition Options', description: 'Use as-is, rework, destroy' },
        { title: 'Justification', description: 'Document reasoning' },
        { title: 'Approval Signatures', description: 'Required approvals' },
      ]}
    />
  );
}
