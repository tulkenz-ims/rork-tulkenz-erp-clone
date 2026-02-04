import { Map } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function ZoneMapScreen() {
  return (
    <SanitationPlaceholder
      title="Sanitation Zone Map"
      description="Facility zone mapping for organized sanitation task assignment"
      icon={Map}
      color="#8B5CF6"
      category="Master Sanitation Scheduling"
      features={[
        { title: 'Zone Definition', description: 'Define and name sanitation zones' },
        { title: 'Area Boundaries', description: 'Clear boundaries for each zone' },
        { title: 'Task Association', description: 'Link tasks to specific zones' },
        { title: 'Crew Assignment', description: 'Assign crews to zones' },
        { title: 'Visual Map', description: 'Interactive facility zone map' },
      ]}
    />
  );
}
