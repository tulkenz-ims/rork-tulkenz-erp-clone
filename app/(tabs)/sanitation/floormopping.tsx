import { Droplets } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function FloorMoppingScreen() {
  return (
    <SanitationPlaceholder
      title="Floor Mopping Log"
      description="Daily floor mopping documentation"
      icon={Droplets}
      color="#EC4899"
      category="Floor Care"
      features={[
        { title: 'Area Mopped', description: 'Document areas mopped' },
        { title: 'Solution Used', description: 'Record cleaning solution type' },
        { title: 'Time Completed', description: 'Log completion time' },
        { title: 'Wet Floor Signs', description: 'Verify safety signage placed' },
        { title: 'Issues Found', description: 'Note any floor damage or issues' },
      ]}
    />
  );
}
