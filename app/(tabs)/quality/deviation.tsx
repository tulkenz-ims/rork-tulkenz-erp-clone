import QualityPlaceholder from '@/components/QualityPlaceholder';
import { GitBranch } from 'lucide-react-native';

export default function DeviationScreen() {
  return (
    <QualityPlaceholder
      title="Deviation Report"
      description="Document planned or unplanned process deviations"
      icon={GitBranch}
      color="#F59E0B"
      category="Non-Conformance"
      features={[
        { title: 'Deviation Type', description: 'Planned or unplanned deviation' },
        { title: 'Process/Product', description: 'Identify affected process or product' },
        { title: 'Deviation Description', description: 'Detail the deviation from standard' },
        { title: 'Impact Assessment', description: 'Evaluate impact on quality' },
        { title: 'Approval', description: 'Required approvals for deviation' },
      ]}
    />
  );
}
