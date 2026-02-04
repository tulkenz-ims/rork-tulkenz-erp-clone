import { BookOpen } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function CourseCatalogScreen() {
  return (
    <HRPlaceholder
      title="Course Catalog"
      description="Browse and search available training courses, programs, and learning resources."
      icon={BookOpen}
      color="#0D9488"
      category="Learning & Development"
      features={[
        { title: 'Course Library', description: 'Searchable training catalog' },
        { title: 'Course Categories', description: 'Organized by topic and skill' },
        { title: 'Course Details', description: 'Duration, format, prerequisites' },
        { title: 'Self-Enrollment', description: 'Employee course registration' },
        { title: 'Course Ratings', description: 'Reviews and feedback' },
      ]}
    />
  );
}
