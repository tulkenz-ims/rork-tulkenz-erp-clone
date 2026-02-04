import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { Search } from 'lucide-react-native';

export default function ReqTrackingScreen() {
  return (
    <ProcurementPlaceholder
      title="Requisition Tracking"
      description="Track status and progress of all purchase requisitions"
      icon={Search}
      color="#06B6D4"
      category="Requisitions"
      features={[
        { title: 'Status Dashboard', description: 'View all requisitions by status in real-time' },
        { title: 'Search & Filter', description: 'Find requisitions by multiple criteria' },
        { title: 'Timeline View', description: 'Visual timeline of requisition lifecycle' },
        { title: 'Status Updates', description: 'Automatic notifications on status changes' },
        { title: 'Aging Reports', description: 'Identify stuck or delayed requisitions' },
      ]}
    />
  );
}
