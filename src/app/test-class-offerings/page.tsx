import { ClassOfferingsClientUI } from "../admin/class-offerings/_components/ClassOfferingsClientUI";

export default function TestClassOfferingsPage() {
  // Mock data for testing
  const mockData = {
    initialClassOfferings: [],
    courses: [],
    allClasses: [],
    classSections: [],
    terms: [],
    teachers: [],
    schoolId: "test-school-id"
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Class Offerings Page</h1>
      <ClassOfferingsClientUI {...mockData} />
    </div>
  );
} 