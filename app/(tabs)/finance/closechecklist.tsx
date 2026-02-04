import FinancePlaceholder from '@/components/FinancePlaceholder';
import { ListChecks } from 'lucide-react-native';

export default function CloseChecklistScreen() {
  return (
    <FinancePlaceholder
      title="Close Checklist"
      description="Month-end close checklist to ensure all tasks are completed."
      icon={ListChecks}
      color="#6366F1"
      category="Period Close"
      features={[
        { title: 'Task List', description: 'Predefined close tasks by category' },
        { title: 'Task Assignment', description: 'Assign tasks to team members' },
        { title: 'Progress Tracking', description: 'Monitor task completion status' },
        { title: 'Dependencies', description: 'Define task dependencies' },
        { title: 'Due Dates', description: 'Set and track task deadlines' },
        { title: 'Sign-Off Workflow', description: 'Document task completion' },
      ]}
    />
  );
}
