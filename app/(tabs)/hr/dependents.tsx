import { Users } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function DependentsScreen() {
  return (
    <HRPlaceholder
      title="Dependent Management"
      description="Manage employee dependents and beneficiary information for benefits enrollment."
      icon={Users}
      color="#E11D48"
      category="Benefits Administration"
      features={[
        { title: 'Dependent Records', description: 'Family member information' },
        { title: 'Beneficiaries', description: 'Life insurance beneficiaries' },
        { title: 'Dependent Verification', description: 'Eligibility documentation' },
        { title: 'Coverage Elections', description: 'Dependent benefit selections' },
        { title: 'Life Events', description: 'Add/remove dependents' },
      ]}
    />
  );
}
