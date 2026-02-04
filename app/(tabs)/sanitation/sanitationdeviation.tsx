import { AlertCircle } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function SanitationDeviationScreen() {
  return (
    <SanitationPlaceholder
      title="Sanitation Deviation Report"
      description="Document deviations from sanitation standards"
      icon={AlertCircle}
      color="#DC2626"
      category="Non-Conformance & Corrective Action"
      features={[
        { title: 'Deviation Description', description: 'Describe the deviation' },
        { title: 'Standard Reference', description: 'SOP or standard deviated from' },
        { title: 'Reason', description: 'Why deviation occurred' },
        { title: 'Impact Assessment', description: 'Evaluate impact' },
        { title: 'Approval', description: 'Supervisor approval if required' },
      ]}
    />
  );
}
