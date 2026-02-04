import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { TestTube } from 'lucide-react-native';

export default function MockRecallScreen() {
  return (
    <InventoryPlaceholder
      title="Mock Recall Testing"
      description="Perform mock recalls to test traceability systems"
      icon={TestTube}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Mock Recall Setup', description: 'Configure mock recall tests' },
        { title: 'Test Execution', description: 'Run mock recall tests' },
        { title: 'Results Analysis', description: 'Analyze test results' },
        { title: 'Compliance Reports', description: 'Generate compliance reports' },
      ]}
    />
  );
}
