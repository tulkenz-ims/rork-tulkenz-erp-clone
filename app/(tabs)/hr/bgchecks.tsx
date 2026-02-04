import { Search } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function BGChecksScreen() {
  return (
    <HRPlaceholder
      title="Background Checks"
      description="Initiate and track pre-employment background checks and screening results."
      icon={Search}
      color="#C084FC"
      category="Talent Acquisition"
      features={[
        { title: 'Background Check Orders', description: 'Initiate screenings' },
        { title: 'Vendor Integration', description: 'Connect to screening providers' },
        { title: 'Status Tracking', description: 'Monitor check progress' },
        { title: 'Adverse Action', description: 'Compliance workflow support' },
        { title: 'Drug Screening', description: 'Pre-employment drug tests' },
      ]}
    />
  );
}
