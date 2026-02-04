import { ClipboardCheck } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function CleaningToolInspectionScreen() {
  return (
    <SanitationPlaceholder
      title="Cleaning Tool Inspection"
      description="Regular inspection log for cleaning tools"
      icon={ClipboardCheck}
      color="#EF4444"
      category="Sanitation Tools & Equipment"
      features={[
        { title: 'Tool ID', description: 'Identify tool inspected' },
        { title: 'Condition Check', description: 'Assess current condition' },
        { title: 'Cleanliness', description: 'Verify tool cleanliness' },
        { title: 'Functionality', description: 'Test tool function' },
        { title: 'Replacement Need', description: 'Flag for replacement' },
      ]}
    />
  );
}
