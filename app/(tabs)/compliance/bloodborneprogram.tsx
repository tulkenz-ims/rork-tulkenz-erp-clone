import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Heart } from 'lucide-react-native';

export default function BloodborneProgramScreen() {
  return (
    <CompliancePlaceholder
      title="Bloodborne Pathogen Program"
      description="Document bloodborne pathogen exposure control plan"
      icon={Heart}
      color="#EC4899"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Exposure Control Plan', description: 'Store written ECP document' },
        { title: 'Job Classifications', description: 'Identify at-risk job classifications' },
        { title: 'Hepatitis B Vaccination', description: 'Track vaccination records' },
        { title: 'Post-Exposure Procedures', description: 'Document exposure protocols' },
        { title: 'Training Records', description: 'Track BBP training' },
      ]}
    />
  );
}
