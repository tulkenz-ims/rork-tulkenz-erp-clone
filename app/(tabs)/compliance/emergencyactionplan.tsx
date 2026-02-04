import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Siren } from 'lucide-react-native';

export default function EmergencyActionPlanScreen() {
  return (
    <CompliancePlaceholder
      title="Emergency Action Plan"
      description="Document emergency action plan and procedures"
      icon={Siren}
      color="#DC2626"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Written Plan', description: 'Store emergency action plan' },
        { title: 'Evacuation Routes', description: 'Document evacuation procedures' },
        { title: 'Emergency Contacts', description: 'List emergency contact information' },
        { title: 'Alarm System', description: 'Document alarm procedures' },
        { title: 'Training Records', description: 'Track EAP training' },
      ]}
    />
  );
}
