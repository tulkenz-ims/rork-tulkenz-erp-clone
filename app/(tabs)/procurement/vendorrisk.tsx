import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { AlertTriangle } from 'lucide-react-native';

export default function VendorRiskScreen() {
  return (
    <ProcurementPlaceholder
      title="Vendor Risk Assessment"
      description="Evaluate and monitor vendor risks"
      icon={AlertTriangle}
      color="#EF4444"
      category="Vendor Management"
      features={[
        { title: 'Risk Scoring', description: 'Calculate vendor risk scores' },
        { title: 'Risk Categories', description: 'Assess financial, operational, compliance risks' },
        { title: 'Mitigation Plans', description: 'Document risk mitigation strategies' },
        { title: 'Monitoring Alerts', description: 'Get alerts on risk score changes' },
        { title: 'Risk Reports', description: 'Generate vendor risk reports' },
      ]}
    />
  );
}
