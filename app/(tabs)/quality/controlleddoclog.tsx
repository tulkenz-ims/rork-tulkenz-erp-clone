import QualityPlaceholder from '@/components/QualityPlaceholder';
import { FolderOpen } from 'lucide-react-native';

export default function ControlledDocLogScreen() {
  return (
    <QualityPlaceholder
      title="Controlled Document Log"
      description="Master log of all controlled documents"
      icon={FolderOpen}
      color="#8B5CF6"
      category="Document Control"
      features={[
        { title: 'Document List', description: 'All controlled documents' },
        { title: 'Version Tracking', description: 'Current version status' },
        { title: 'Review Schedule', description: 'Periodic review dates' },
        { title: 'Distribution', description: 'Document distribution list' },
        { title: 'History', description: 'Revision history' },
      ]}
    />
  );
}
