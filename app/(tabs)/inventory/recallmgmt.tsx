import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { AlertOctagon } from 'lucide-react-native';

export default function RecallMgmtScreen() {
  return (
    <InventoryPlaceholder
      title="Recall Management"
      description="Manage product recalls and affected lot identification"
      icon={AlertOctagon}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Recall Initiation', description: 'Create and manage recalls' },
        { title: 'Affected Lots', description: 'Identify affected lots' },
        { title: 'Customer Notification', description: 'Generate notification lists' },
        { title: 'Recall Status', description: 'Track recall progress' },
      ]}
    />
  );
}
