import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Users } from 'lucide-react-native';

export default function MgmtReviewMinutesScreen() {
  return (
    <CompliancePlaceholder
      title="Management Review Minutes"
      description="Document management review meetings for food safety system effectiveness"
      icon={Users}
      color="#6366F1"
      category="SQF / GFSI Certification"
      features={[
        { title: 'Meeting Agenda', description: 'Document review agenda items' },
        { title: 'Attendees', description: 'Record meeting participants' },
        { title: 'System Performance', description: 'Review food safety system metrics' },
        { title: 'Action Items', description: 'Track decisions and action items' },
        { title: 'Follow-Up', description: 'Monitor action item completion' },
      ]}
    />
  );
}
