import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { FileText } from 'lucide-react-native';

export default function ContractTemplatesScreen() {
  return (
    <ProcurementPlaceholder
      title="Contract Templates"
      description="Manage standard contract templates and clauses"
      icon={FileText}
      color="#8B5CF6"
      category="Contract Management"
      features={[
        { title: 'Template Library', description: 'Maintain standard contract templates' },
        { title: 'Clause Library', description: 'Reusable contract clauses' },
        { title: 'Quick Generation', description: 'Generate contracts from templates' },
        { title: 'Version Control', description: 'Track template revisions' },
        { title: 'Legal Approval', description: 'Route templates for legal review' },
      ]}
    />
  );
}
