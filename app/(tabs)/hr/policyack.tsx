import { FileWarning } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function PolicyAckScreen() {
  return (
    <HRPlaceholder
      title="Policy Acknowledgments"
      description="Distribute policies and handbooks, and track employee acknowledgment signatures."
      icon={FileWarning}
      color="#7C2D12"
      category="HR Compliance & Reporting"
      features={[
        { title: 'Policy Distribution', description: 'Send policies to employees' },
        { title: 'E-Signatures', description: 'Digital acknowledgment' },
        { title: 'Handbook Updates', description: 'Track policy versions' },
        { title: 'Completion Tracking', description: 'Monitor acknowledgment status' },
        { title: 'Compliance Reports', description: 'Audit-ready documentation' },
      ]}
    />
  );
}
