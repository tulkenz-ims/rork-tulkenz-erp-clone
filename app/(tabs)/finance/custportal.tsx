import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Globe } from 'lucide-react-native';

export default function CustomerPortalScreen() {
  return (
    <FinancePlaceholder
      title="Customer Portal"
      description="Self-service portal for customers to view invoices and make payments."
      icon={Globe}
      color="#BFDBFE"
      category="Accounts Receivable"
      features={[
        { title: 'Invoice Access', description: 'Customers view their invoices online' },
        { title: 'Online Payments', description: 'Accept credit card and ACH payments' },
        { title: 'Statement Download', description: 'Customers download account statements' },
        { title: 'Payment History', description: 'View past payment records' },
        { title: 'Dispute Management', description: 'Submit and track invoice disputes' },
        { title: 'Document Access', description: 'Download supporting documents' },
      ]}
    />
  );
}
