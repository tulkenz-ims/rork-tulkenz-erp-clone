import QualityPlaceholder from '@/components/QualityPlaceholder';
import { TrendingUp } from 'lucide-react-native';

export default function SupplierPerformanceScreen() {
  return (
    <QualityPlaceholder
      title="Supplier Performance Review"
      description="Conduct periodic supplier performance reviews"
      icon={TrendingUp}
      color="#F59E0B"
      category="Supplier Quality"
      features={[
        { title: 'Review Period', description: 'Time period for review' },
        { title: 'Performance Data', description: 'Quality, delivery, cost' },
        { title: 'Trends', description: 'Performance trends' },
        { title: 'Issues', description: 'Outstanding issues' },
        { title: 'Action Items', description: 'Improvement actions' },
      ]}
    />
  );
}
