import { Medal } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function SkillsInventoryScreen() {
  return (
    <HRPlaceholder
      title="Skills Inventory"
      description="Track employee skills, competencies, and identify gaps for development planning."
      icon={Medal}
      color="#042F2E"
      category="Learning & Development"
      features={[
        { title: 'Skills Database', description: 'Comprehensive skill catalog' },
        { title: 'Self-Assessment', description: 'Employee skill ratings' },
        { title: 'Manager Assessment', description: 'Validated skill levels' },
        { title: 'Gap Analysis', description: 'Identify development needs' },
        { title: 'Skills Search', description: 'Find employees by skill' },
      ]}
    />
  );
}
