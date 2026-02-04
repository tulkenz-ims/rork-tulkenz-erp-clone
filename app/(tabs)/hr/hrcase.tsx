import { FolderOpen } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function HRCaseScreen() {
  return (
    <HRPlaceholder
      title="HR Case Management"
      description="Manage employee relations cases, investigations, and HR service requests."
      icon={FolderOpen}
      color="#9A3412"
      category="HR Compliance & Reporting"
      features={[
        { title: 'Case Creation', description: 'Open and categorize cases' },
        { title: 'Investigation Workflow', description: 'Structured investigation process' },
        { title: 'Documentation', description: 'Attach evidence and notes' },
        { title: 'Case Resolution', description: 'Track outcomes and actions' },
        { title: 'Case Reports', description: 'Analytics and trends' },
      ]}
    />
  );
}
