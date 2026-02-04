import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { CircleDot } from 'lucide-react-native';

export default function ConfinedSpaceProgramScreen() {
  return (
    <CompliancePlaceholder
      title="Written Confined Space Program"
      description="Document permit-required confined space entry program"
      icon={CircleDot}
      color="#F59E0B"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Space Inventory', description: 'List all permit-required confined spaces' },
        { title: 'Entry Procedures', description: 'Document entry procedures' },
        { title: 'Rescue Plan', description: 'Store rescue procedures' },
        { title: 'Training Records', description: 'Track entrant/attendant training' },
        { title: 'Annual Review', description: 'Document program reviews' },
      ]}
    />
  );
}
