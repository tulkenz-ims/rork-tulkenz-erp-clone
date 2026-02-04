import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Target } from 'lucide-react-native';

export default function CapitalProjectsScreen() {
  return (
    <FinancePlaceholder
      title="Capital Projects"
      description="Track construction in progress and capital project spending."
      icon={Target}
      color="#9A3412"
      category="Fixed Assets"
      features={[
        { title: 'Project Setup', description: 'Create and configure capital projects' },
        { title: 'Cost Accumulation', description: 'Track costs during construction' },
        { title: 'Budget vs Actual', description: 'Monitor project spending against budget' },
        { title: 'Capitalization', description: 'Convert CIP to fixed assets' },
        { title: 'Project Timeline', description: 'Track project milestones and completion' },
        { title: 'Project Reporting', description: 'Capital project status reports' },
      ]}
    />
  );
}
