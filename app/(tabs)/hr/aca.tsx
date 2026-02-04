import { Clipboard } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function ACAScreen() {
  return (
    <HRPlaceholder
      title="ACA Compliance"
      description="Track Affordable Care Act compliance and generate 1094-C and 1095-C reports."
      icon={Clipboard}
      color="#0C4A6E"
      category="HR Compliance & Reporting"
      features={[
        { title: 'ACA Eligibility', description: 'Track full-time status' },
        { title: 'Measurement Periods', description: 'Configure look-back periods' },
        { title: '1095-C Generation', description: 'Employee statements' },
        { title: '1094-C Filing', description: 'Transmittal filing' },
        { title: 'ALE Determination', description: 'Applicable large employer status' },
      ]}
    />
  );
}
