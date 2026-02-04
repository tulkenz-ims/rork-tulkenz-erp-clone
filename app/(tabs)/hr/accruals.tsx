import { Repeat } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function AccrualsScreen() {
  return (
    <HRPlaceholder
      title="Accrual Management"
      description="Configure and manage leave accrual rules, caps, and carryover policies."
      icon={Repeat}
      color="#14B8A6"
      category="Time & Attendance"
      features={[
        { title: 'Accrual Rules', description: 'Configure accrual rates and frequencies' },
        { title: 'Accrual Caps', description: 'Set maximum balance limits' },
        { title: 'Carryover Rules', description: 'Year-end rollover policies' },
        { title: 'Tenure-Based Accruals', description: 'Rates based on years of service' },
        { title: 'Accrual Reports', description: 'Liability and balance reporting' },
      ]}
    />
  );
}
