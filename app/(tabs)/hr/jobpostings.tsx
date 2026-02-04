import { Megaphone } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function JobPostingsScreen() {
  return (
    <HRPlaceholder
      title="Job Postings"
      description="Create and distribute job postings across job boards and your company career page."
      icon={Megaphone}
      color="#7C3AED"
      category="Talent Acquisition"
      features={[
        { title: 'Posting Templates', description: 'Reusable job posting formats' },
        { title: 'Job Board Integration', description: 'Post to Indeed, LinkedIn, etc.' },
        { title: 'Career Page', description: 'Company-branded careers site' },
        { title: 'Application Tracking', description: 'Track posting performance' },
        { title: 'Internal Postings', description: 'Employee-only job listings' },
      ]}
    />
  );
}
