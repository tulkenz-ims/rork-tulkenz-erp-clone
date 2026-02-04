import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { ShieldAlert } from 'lucide-react-native';

export default function FoodDefensePlanScreen() {
  return (
    <CompliancePlaceholder
      title="Food Defense Plan"
      description="Document comprehensive food defense plan for intentional adulteration prevention"
      icon={ShieldAlert}
      color="#DC2626"
      category="Food Defense (FSMA IA)"
      features={[
        { title: 'Plan Documentation', description: 'Store written food defense plan' },
        { title: 'Team Members', description: 'Document food defense team' },
        { title: 'Facility Assessment', description: 'Track security assessments' },
        { title: 'Procedures', description: 'Document preventive procedures' },
        { title: 'Review Schedule', description: 'Track plan review dates' },
      ]}
    />
  );
}
