import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { HeartHandshake } from 'lucide-react-native';

export default function FMLADocScreen() {
  return (
    <CompliancePlaceholder
      title="FMLA Leave Documentation"
      description="Document Family and Medical Leave Act compliance"
      icon={HeartHandshake}
      color="#EC4899"
      category="Labor / Employment Compliance"
      features={[
        { title: 'Leave Requests', description: 'Track FMLA leave requests' },
        { title: 'Eligibility Verification', description: 'Document employee eligibility' },
        { title: 'Certification Forms', description: 'Store medical certifications' },
        { title: 'Leave Tracking', description: 'Monitor leave usage' },
        { title: 'Return to Work', description: 'Document return to work' },
      ]}
    />
  );
}
