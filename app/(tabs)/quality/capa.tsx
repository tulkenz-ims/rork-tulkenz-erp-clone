import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Target } from 'lucide-react-native';

export default function CAPAScreen() {
  return (
    <QualityPlaceholder
      title="CAPA (Corrective & Preventive Action)"
      description="Document corrective and preventive action plans"
      icon={Target}
      color="#8B5CF6"
      category="Non-Conformance"
      features={[
        { title: 'CAPA Number', description: 'Auto-generated tracking number' },
        { title: 'Issue Description', description: 'Link to NCR or source issue' },
        { title: 'Root Cause Analysis', description: 'Document root cause findings' },
        { title: 'Corrective Actions', description: 'Define corrective action plan' },
        { title: 'Preventive Actions', description: 'Define preventive measures' },
        { title: 'Effectiveness Verification', description: 'Track and verify closure' },
      ]}
    />
  );
}
