import FinancePlaceholder from '@/components/FinancePlaceholder';
import { ClipboardList } from 'lucide-react-native';

export default function JobCostingScreen() {
  return (
    <FinancePlaceholder
      title="Job Costing"
      description="Track costs by job, project, or work order."
      icon={ClipboardList}
      color="#6D28D9"
      category="Cost Accounting"
      features={[
        { title: 'Job Setup', description: 'Create jobs and cost tracking' },
        { title: 'Cost Accumulation', description: 'Capture labor, material, overhead' },
        { title: 'Budget vs Actual', description: 'Compare job budgets to actuals' },
        { title: 'WIP Tracking', description: 'Monitor work in progress' },
        { title: 'Job Profitability', description: 'Calculate job-level profit' },
        { title: 'Job Completion', description: 'Close jobs and recognize revenue' },
      ]}
    />
  );
}
