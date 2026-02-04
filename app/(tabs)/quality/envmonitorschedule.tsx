import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Calendar } from 'lucide-react-native';

export default function EnvMonitorScheduleScreen() {
  return (
    <QualityPlaceholder
      title="Environmental Monitoring Schedule"
      description="Manage environmental monitoring schedule"
      icon={Calendar}
      color="#3B82F6"
      category="Environmental Monitoring"
      features={[
        { title: 'Sampling Sites', description: 'Define monitoring locations' },
        { title: 'Frequency', description: 'Set sampling frequency' },
        { title: 'Zone Assignment', description: 'Assign zones to locations' },
        { title: 'Test Types', description: 'Tests required at each site' },
        { title: 'Schedule View', description: 'Calendar view of schedule' },
      ]}
    />
  );
}
