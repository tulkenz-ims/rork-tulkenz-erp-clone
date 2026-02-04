import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Ear } from 'lucide-react-native';

export default function HearingConservationProgramScreen() {
  return (
    <CompliancePlaceholder
      title="Hearing Conservation Program"
      description="Document hearing conservation program for noise exposure"
      icon={Ear}
      color="#10B981"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Written Program', description: 'Store hearing conservation program' },
        { title: 'Noise Monitoring', description: 'Document noise level assessments' },
        { title: 'Audiometric Testing', description: 'Track annual audiograms' },
        { title: 'HPD Selection', description: 'Document hearing protection' },
        { title: 'Training Records', description: 'Track hearing conservation training' },
      ]}
    />
  );
}
