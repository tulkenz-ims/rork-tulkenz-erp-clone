import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { FileQuestion } from 'lucide-react-native';

export default function RFQScreen() {
  return (
    <ProcurementPlaceholder
      title="Request for Quote (RFQ)"
      description="Create and manage requests for quotes from vendors"
      icon={FileQuestion}
      color="#3B82F6"
      category="Strategic Sourcing"
      features={[
        { title: 'RFQ Creation', description: 'Create detailed requests for quotes' },
        { title: 'Vendor Distribution', description: 'Send RFQs to multiple vendors' },
        { title: 'Quote Collection', description: 'Receive and organize vendor quotes' },
        { title: 'Quote Comparison', description: 'Compare quotes side by side' },
        { title: 'Award Process', description: 'Select winning vendor and notify' },
      ]}
    />
  );
}
