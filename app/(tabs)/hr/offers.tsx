import { Send } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function OffersScreen() {
  return (
    <HRPlaceholder
      title="Offer Management"
      description="Generate, send, and track job offer letters with approval workflows."
      icon={Send}
      color="#A855F7"
      category="Talent Acquisition"
      features={[
        { title: 'Offer Templates', description: 'Customizable offer letter formats' },
        { title: 'Offer Approval', description: 'Compensation approval workflow' },
        { title: 'E-Signatures', description: 'Digital offer acceptance' },
        { title: 'Offer Tracking', description: 'Monitor offer status and responses' },
        { title: 'Negotiation History', description: 'Track offer revisions' },
      ]}
    />
  );
}
