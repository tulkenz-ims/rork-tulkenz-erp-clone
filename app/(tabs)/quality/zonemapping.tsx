import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Map } from 'lucide-react-native';

export default function ZoneMappingScreen() {
  return (
    <QualityPlaceholder
      title="Zone Mapping/Swab Location Form"
      description="Document and manage swab sampling locations"
      icon={Map}
      color="#6366F1"
      category="Environmental Monitoring"
      features={[
        { title: 'Facility Map', description: 'Visual facility layout' },
        { title: 'Zone Definition', description: 'Define Zone 1-4 areas' },
        { title: 'Sample Points', description: 'Mark sampling locations' },
        { title: 'Site Rotation', description: 'Manage site rotation' },
        { title: 'History', description: 'Historical results by site' },
      ]}
    />
  );
}
