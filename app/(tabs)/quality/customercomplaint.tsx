import QualityPlaceholder from '@/components/QualityPlaceholder';
import { MessageSquare } from 'lucide-react-native';

export default function CustomerComplaintScreen() {
  return (
    <QualityPlaceholder
      title="Customer Complaint Form"
      description="Document and investigate customer complaints"
      icon={MessageSquare}
      color="#DC2626"
      category="Non-Conformance"
      features={[
        { title: 'Complaint Details', description: 'Customer info and complaint' },
        { title: 'Product Information', description: 'Product, lot, date code' },
        { title: 'Investigation', description: 'Document investigation findings' },
        { title: 'Root Cause', description: 'Determine root cause' },
        { title: 'Customer Response', description: 'Document response to customer' },
        { title: 'Corrective Action', description: 'Link to CAPA if needed' },
      ]}
    />
  );
}
