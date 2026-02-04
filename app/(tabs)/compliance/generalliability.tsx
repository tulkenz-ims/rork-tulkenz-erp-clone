import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Shield } from 'lucide-react-native';

export default function GeneralLiabilityScreen() {
  return (
    <CompliancePlaceholder
      title="General Liability Insurance"
      description="Track general liability insurance certificate and coverage"
      icon={Shield}
      color="#3B82F6"
      category="Insurance & Liability"
      features={[
        { title: 'Policy Number', description: 'Document policy identification' },
        { title: 'Coverage Limits', description: 'Track coverage amounts' },
        { title: 'Certificate', description: 'Store current COI' },
        { title: 'Expiration Date', description: 'Monitor renewal dates' },
        { title: 'Carrier Information', description: 'Document insurer details' },
      ]}
    />
  );
}
