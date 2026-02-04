import FinancePlaceholder from '@/components/FinancePlaceholder';
import { TrendingUp } from 'lucide-react-native';

export default function ForecastingScreen() {
  return (
    <FinancePlaceholder
      title="Forecasting"
      description="Create rolling forecasts and scenario planning models."
      icon={TrendingUp}
      color="#FACC15"
      category="Budgeting & Planning"
      features={[
        { title: 'Rolling Forecasts', description: 'Continuously updated forecasts' },
        { title: 'Scenario Planning', description: 'Create what-if scenarios' },
        { title: 'Driver-Based Planning', description: 'Link forecasts to business drivers' },
        { title: 'Forecast Versions', description: 'Maintain multiple forecast versions' },
        { title: 'Forecast vs Actual', description: 'Track forecast accuracy' },
        { title: 'Collaborative Planning', description: 'Department input and rollup' },
      ]}
    />
  );
}
