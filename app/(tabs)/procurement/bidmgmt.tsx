import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { Gavel } from 'lucide-react-native';

export default function BidMgmtScreen() {
  return (
    <ProcurementPlaceholder
      title="Bid Management"
      description="Manage competitive bidding and vendor negotiations"
      icon={Gavel}
      color="#F59E0B"
      category="Strategic Sourcing"
      features={[
        { title: 'Bid Events', description: 'Create and manage bid events' },
        { title: 'Bid Comparison', description: 'Compare bids with detailed analysis' },
        { title: 'Bid Scoring', description: 'Score bids against criteria' },
        { title: 'Negotiation Tracking', description: 'Track negotiation progress' },
        { title: 'Award Notifications', description: 'Notify winners and losers' },
      ]}
    />
  );
}
