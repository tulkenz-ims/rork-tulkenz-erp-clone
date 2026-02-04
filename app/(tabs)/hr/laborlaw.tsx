import { Gavel } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function LaborLawScreen() {
  return (
    <HRPlaceholder
      title="Labor Law Compliance"
      description="Track labor law poster requirements and regulatory compliance by location."
      icon={Gavel}
      color="#431407"
      category="HR Compliance & Reporting"
      features={[
        { title: 'Poster Requirements', description: 'Federal and state posters' },
        { title: 'Location Tracking', description: 'Site-specific requirements' },
        { title: 'Update Alerts', description: 'Law change notifications' },
        { title: 'Digital Posters', description: 'Electronic poster access' },
        { title: 'Compliance Checklist', description: 'Audit preparation' },
      ]}
    />
  );
}
