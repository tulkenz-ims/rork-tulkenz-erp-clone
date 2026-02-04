import FinancePlaceholder from '@/components/FinancePlaceholder';
import { GitBranch } from 'lucide-react-native';

export default function CostCentersScreen() {
  return (
    <FinancePlaceholder
      title="Cost Centers"
      description="Define and manage cost center hierarchy and allocations."
      icon={GitBranch}
      color="#7C3AED"
      category="Cost Accounting"
      features={[
        { title: 'Cost Center Setup', description: 'Create cost center structure' },
        { title: 'Hierarchy Management', description: 'Define parent-child relationships' },
        { title: 'Cost Allocation', description: 'Allocate costs across centers' },
        { title: 'Allocation Rules', description: 'Configure allocation methods' },
        { title: 'Cost Center Reports', description: 'Spending by cost center' },
        { title: 'Manager Assignment', description: 'Assign responsible managers' },
      ]}
    />
  );
}
