import { FolderOpen } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function TalentPoolScreen() {
  return (
    <HRPlaceholder
      title="Talent Pool"
      description="Build and manage a database of qualified candidates for future opportunities."
      icon={FolderOpen}
      color="#D8B4FE"
      category="Talent Acquisition"
      features={[
        { title: 'Candidate Database', description: 'Searchable talent repository' },
        { title: 'Talent Tags', description: 'Categorize by skills and experience' },
        { title: 'Pipeline Management', description: 'Nurture future candidates' },
        { title: 'Outreach Campaigns', description: 'Re-engage past applicants' },
        { title: 'Source Tracking', description: 'Track candidate origins' },
      ]}
    />
  );
}
