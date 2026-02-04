import { FileText } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function NewHireFormsScreen() {
  return (
    <HRPlaceholder
      title="New Hire Forms"
      description="Digital forms for I-9, W-4, direct deposit, and other new hire paperwork."
      icon={FileText}
      color="#10B981"
      category="Onboarding"
      features={[
        { title: 'I-9 Form', description: 'Employment eligibility verification' },
        { title: 'W-4 Form', description: 'Tax withholding elections' },
        { title: 'Direct Deposit', description: 'Banking information setup' },
        { title: 'Emergency Contacts', description: 'Contact information collection' },
        { title: 'Policy Acknowledgments', description: 'Digital signature collection' },
      ]}
    />
  );
}
