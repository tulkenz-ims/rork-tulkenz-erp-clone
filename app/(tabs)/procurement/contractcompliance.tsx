import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { Shield } from 'lucide-react-native';

export default function ContractComplianceScreen() {
  return (
    <ProcurementPlaceholder
      title="Contract Compliance"
      description="Monitor and ensure compliance with contract terms"
      icon={Shield}
      color="#EF4444"
      category="Contract Management"
      features={[
        { title: 'Obligation Tracking', description: 'Track contract obligations' },
        { title: 'Compliance Monitoring', description: 'Monitor compliance with terms' },
        { title: 'Performance vs Contract', description: 'Compare actual vs contracted' },
        { title: 'Penalty Tracking', description: 'Track penalties and liquidated damages' },
        { title: 'Compliance Reports', description: 'Generate compliance reports' },
      ]}
    />
  );
}
