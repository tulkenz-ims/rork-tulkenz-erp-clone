import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { FileText } from 'lucide-react-native';

export default function RFPScreen() {
  return (
    <ProcurementPlaceholder
      title="Request for Proposal (RFP)"
      description="Manage complex procurement through formal proposals"
      icon={FileText}
      color="#8B5CF6"
      category="Strategic Sourcing"
      features={[
        { title: 'RFP Creation', description: 'Create comprehensive RFP documents' },
        { title: 'Evaluation Criteria', description: 'Define weighted scoring criteria' },
        { title: 'Proposal Collection', description: 'Receive vendor proposals securely' },
        { title: 'Evaluation Scoring', description: 'Score proposals against criteria' },
        { title: 'Selection Committee', description: 'Collaborate on vendor selection' },
      ]}
    />
  );
}
