import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { HardHat } from 'lucide-react-native';

export default function WorkersCompInsuranceScreen() {
  return (
    <CompliancePlaceholder
      title="Workers Compensation Insurance"
      description="Track workers compensation insurance certificate"
      icon={HardHat}
      color="#F59E0B"
      category="Insurance & Liability"
      features={[
        { title: 'Policy Information', description: 'Document policy details' },
        { title: 'Coverage', description: 'Track coverage by state' },
        { title: 'Certificate', description: 'Store current certificate' },
        { title: 'Experience Mod', description: 'Track EMR rating' },
        { title: 'Renewal Date', description: 'Monitor policy renewal' },
      ]}
    />
  );
}
