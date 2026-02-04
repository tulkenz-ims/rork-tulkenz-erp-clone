import { Megaphone } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function AnnouncementsScreen() {
  return (
    <HRPlaceholder
      title="Announcements"
      description="Create and manage company-wide announcements, news, and bulletin board posts."
      icon={Megaphone}
      color="#DB2777"
      category="Employee Engagement"
      features={[
        { title: 'Announcement Creation', description: 'Post company news' },
        { title: 'Targeting', description: 'Department or location-specific' },
        { title: 'Scheduling', description: 'Schedule future posts' },
        { title: 'Read Tracking', description: 'Monitor engagement' },
        { title: 'Rich Media', description: 'Images and attachments' },
      ]}
    />
  );
}
