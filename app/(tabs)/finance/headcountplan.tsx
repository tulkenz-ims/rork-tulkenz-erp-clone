import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Users } from 'lucide-react-native';

export default function HeadcountPlanningScreen() {
  return (
    <FinancePlaceholder
      title="Headcount Planning"
      description="Plan personnel budgets and workforce requirements."
      icon={Users}
      color="#92400E"
      category="Budgeting & Planning"
      features={[
        { title: 'Position Planning', description: 'Plan new and existing positions' },
        { title: 'Salary Budgeting', description: 'Budget salaries and increases' },
        { title: 'Benefits Costing', description: 'Calculate benefits costs per employee' },
        { title: 'Department Rollup', description: 'Aggregate by department' },
        { title: 'FTE Tracking', description: 'Monitor full-time equivalent counts' },
        { title: 'Vacancy Management', description: 'Track open positions and timing' },
      ]}
    />
  );
}
