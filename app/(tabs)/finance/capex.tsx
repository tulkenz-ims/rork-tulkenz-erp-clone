import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Building } from 'lucide-react-native';

export default function CapExPlanningScreen() {
  return (
    <FinancePlaceholder
      title="CapEx Planning"
      description="Plan and track capital expenditure requests and approvals."
      icon={Building}
      color="#A16207"
      category="Budgeting & Planning"
      features={[
        { title: 'CapEx Requests', description: 'Submit capital expenditure requests' },
        { title: 'ROI Analysis', description: 'Calculate return on investment' },
        { title: 'Approval Workflow', description: 'Multi-level CapEx approval' },
        { title: 'Budget Allocation', description: 'Allocate CapEx budget by project' },
        { title: 'Spending Tracking', description: 'Monitor actual vs planned spending' },
        { title: 'Project Prioritization', description: 'Rank and prioritize projects' },
      ]}
    />
  );
}
