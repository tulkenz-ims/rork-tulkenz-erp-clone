import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Flame } from 'lucide-react-native';

export default function FirePreventionPlanScreen() {
  return (
    <CompliancePlaceholder
      title="Fire Prevention Plan"
      description="Document fire prevention plan and procedures"
      icon={Flame}
      color="#F97316"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Written Plan', description: 'Store fire prevention plan' },
        { title: 'Fire Hazards', description: 'Identify major fire hazards' },
        { title: 'Control Procedures', description: 'Document fire prevention controls' },
        { title: 'Equipment Maintenance', description: 'Track fire protection equipment' },
        { title: 'Training Records', description: 'Document fire prevention training' },
      ]}
    />
  );
}
