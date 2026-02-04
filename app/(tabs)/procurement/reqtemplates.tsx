import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { FileText } from 'lucide-react-native';

export default function ReqTemplatesScreen() {
  return (
    <ProcurementPlaceholder
      title="Requisition Templates"
      description="Create and manage reusable requisition templates"
      icon={FileText}
      color="#F59E0B"
      category="Requisitions"
      features={[
        { title: 'Template Library', description: 'Maintain a library of common requisition templates' },
        { title: 'Quick Creation', description: 'Create new requisitions from templates instantly' },
        { title: 'Template Sharing', description: 'Share templates across departments' },
        { title: 'Version Control', description: 'Track template changes over time' },
        { title: 'Default Values', description: 'Pre-populate vendor, items, and pricing' },
      ]}
    />
  );
}
