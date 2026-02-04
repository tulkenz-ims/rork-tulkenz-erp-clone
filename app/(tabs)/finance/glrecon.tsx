import FinancePlaceholder from '@/components/FinancePlaceholder';
import { CheckCircle } from 'lucide-react-native';

export default function GLReconciliationScreen() {
  return (
    <FinancePlaceholder
      title="GL Reconciliation"
      description="Reconcile general ledger accounts to subledgers and external statements."
      icon={CheckCircle}
      color="#6D28D9"
      category="General Ledger"
      features={[
        { title: 'Account Selection', description: 'Choose accounts to reconcile' },
        { title: 'Subledger Matching', description: 'Match GL to AP, AR, and other subledgers' },
        { title: 'Variance Identification', description: 'Highlight discrepancies for investigation' },
        { title: 'Reconciliation Status', description: 'Track reconciliation progress by account' },
        { title: 'Sign-Off Workflow', description: 'Document reviewer approval' },
        { title: 'Historical Tracking', description: 'View past reconciliation records' },
      ]}
    />
  );
}
