import { Cog } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function FloorScrubberPMScreen() {
  return (
    <SanitationPlaceholder
      title="Floor Scrubber Maintenance"
      description="Preventive maintenance for floor scrubbing equipment"
      icon={Cog}
      color="#EF4444"
      category="Sanitation Tools & Equipment"
      features={[
        { title: 'Equipment ID', description: 'Identify scrubber unit' },
        { title: 'Battery Check', description: 'Battery condition and charge' },
        { title: 'Brush/Pad Changes', description: 'Track brush replacements' },
        { title: 'Squeegee Check', description: 'Squeegee condition' },
        { title: 'PM Schedule', description: 'Preventive maintenance schedule' },
      ]}
    />
  );
}
