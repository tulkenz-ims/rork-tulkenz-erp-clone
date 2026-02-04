import { RotateCcw } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function FloorScrubbingScreen() {
  return (
    <SanitationPlaceholder
      title="Floor Scrubbing/Buffing Schedule"
      description="Schedule for machine scrubbing and buffing floors"
      icon={RotateCcw}
      color="#EC4899"
      category="Floor Care"
      features={[
        { title: 'Schedule', description: 'Planned scrubbing/buffing dates' },
        { title: 'Area Coverage', description: 'Areas to be serviced' },
        { title: 'Equipment Used', description: 'Machine and pad types used' },
        { title: 'Completion Status', description: 'Track completion' },
        { title: 'Next Service Date', description: 'Schedule next service' },
      ]}
    />
  );
}
