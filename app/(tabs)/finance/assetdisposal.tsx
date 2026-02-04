import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Scissors } from 'lucide-react-native';

export default function AssetDisposalScreen() {
  return (
    <FinancePlaceholder
      title="Asset Disposal"
      description="Process asset sales, transfers, and write-offs with proper accounting."
      icon={Scissors}
      color="#FB923C"
      category="Fixed Assets"
      features={[
        { title: 'Asset Sales', description: 'Record asset sales and calculate gain/loss' },
        { title: 'Asset Transfers', description: 'Transfer assets between locations' },
        { title: 'Write-Offs', description: 'Process asset write-offs and impairments' },
        { title: 'Disposal Approval', description: 'Workflow for disposal authorization' },
        { title: 'Gain/Loss Calculation', description: 'Automatic calculation of disposal results' },
        { title: 'Disposal History', description: 'Track all asset dispositions' },
      ]}
    />
  );
}
