import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { HelpCircle } from 'lucide-react-native';

export default function RFIScreen() {
  return (
    <ProcurementPlaceholder
      title="Request for Information (RFI)"
      description="Gather information from potential vendors before sourcing"
      icon={HelpCircle}
      color="#10B981"
      category="Strategic Sourcing"
      features={[
        { title: 'RFI Creation', description: 'Create information request documents' },
        { title: 'Vendor Outreach', description: 'Send RFIs to potential vendors' },
        { title: 'Response Collection', description: 'Collect and organize vendor responses' },
        { title: 'Market Research', description: 'Analyze market capabilities' },
        { title: 'Vendor Shortlisting', description: 'Identify qualified vendors for RFQ/RFP' },
      ]}
    />
  );
}
