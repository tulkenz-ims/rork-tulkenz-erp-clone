import { DollarSign } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function FinalPayScreen() {
  return (
    <HRPlaceholder
      title="Final Pay Calculation"
      description="Calculate final wages, PTO payout, and other compensation for departing employees."
      icon={DollarSign}
      color="#7F1D1D"
      category="Offboarding"
      features={[
        { title: 'Final Wages', description: 'Calculate remaining pay' },
        { title: 'PTO Payout', description: 'Accrued leave payment' },
        { title: 'Deductions', description: 'Final deduction processing' },
        { title: 'State Compliance', description: 'Final pay timing rules' },
        { title: 'Payment Delivery', description: 'Check or direct deposit' },
      ]}
    />
  );
}
