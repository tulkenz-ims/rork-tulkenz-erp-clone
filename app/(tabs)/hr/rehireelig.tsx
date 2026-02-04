import { BadgeCheck } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function RehireEligScreen() {
  return (
    <HRPlaceholder
      title="Rehire Eligibility"
      description="Track rehire eligibility status and manage former employee records."
      icon={BadgeCheck}
      color="#64748B"
      category="Offboarding"
      features={[
        { title: 'Rehire Status', description: 'Eligible, ineligible, conditional' },
        { title: 'Separation Reason', description: 'Document departure details' },
        { title: 'Performance History', description: 'Access historical records' },
        { title: 'Manager Notes', description: 'Rehire recommendations' },
        { title: 'Alumni Database', description: 'Former employee tracking' },
      ]}
    />
  );
}
