import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Trash2 } from 'lucide-react-native';

export default function ObsoleteDocScreen() {
  return (
    <QualityPlaceholder
      title="Obsolete Document Disposal Log"
      description="Track disposal of obsolete controlled documents"
      icon={Trash2}
      color="#6366F1"
      category="Document Control"
      features={[
        { title: 'Document ID', description: 'Obsolete document details' },
        { title: 'Superseded By', description: 'New document reference' },
        { title: 'Disposal Method', description: 'How document was disposed' },
        { title: 'Disposal Date', description: 'When disposed' },
        { title: 'Witness', description: 'Disposal verification' },
      ]}
    />
  );
}
