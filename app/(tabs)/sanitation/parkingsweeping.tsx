import { Car } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function ParkingSweepingScreen() {
  return (
    <SanitationPlaceholder
      title="Parking Lot Sweeping"
      description="Log for parking lot sweeping and cleaning"
      icon={Car}
      color="#22C55E"
      category="Exterior/Grounds"
      features={[
        { title: 'Area Covered', description: 'Document areas swept' },
        { title: 'Debris Removal', description: 'Type of debris collected' },
        { title: 'Equipment Used', description: 'Sweeper or manual' },
        { title: 'Frequency', description: 'Track sweeping frequency' },
        { title: 'Contractor Service', description: 'Track contractor visits' },
      ]}
    />
  );
}
