import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Users } from 'lucide-react-native';

export default function VisitorLogScreen() {
  return (
    <QualityPlaceholder
      title="Visitor Log with GMP Acknowledgment"
      description="Log visitors and document GMP training acknowledgment"
      icon={Users}
      color="#8B5CF6"
      category="GMP & Hygiene"
      features={[
        { title: 'Visitor Info', description: 'Name, company, purpose' },
        { title: 'Sign In/Out', description: 'Track entry and exit' },
        { title: 'GMP Training', description: 'Document training provided' },
        { title: 'Acknowledgment', description: 'Visitor signature' },
        { title: 'Escort', description: 'Assigned escort' },
      ]}
    />
  );
}
