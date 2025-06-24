import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { 
  getScheduledLessons, 
  getTimetableGenerations, 
  getClassesForSchool, 
  getTeachersForSchool, 
  getTermsForSchool 
} from '@/lib/api/timetables-simple-server';
import TimetablesClientUI from './_components/TimetablesClientUI';

export default async function TimetablesPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-red-800 font-semibold">Error</h2>
          <p className="text-red-600">Error loading user profile. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-red-800 font-semibold">Profile Not Found</h2>
          <p className="text-red-600">User profile not found. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  if (profile.role !== 'admin') {
    redirect('/unauthorized');
  }

  if (!profile.school_id) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h2 className="text-blue-800 font-semibold">Setup Required</h2>
          <p className="text-blue-600 mb-4">
            You need to complete the initial setup for your school before you can view timetables.
          </p>
          <a 
            href="/admin/onboarding" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Complete Setup
          </a>
        </div>
      </div>
    );
  }

  // Fetch initial data for the page using the new simplified API
  try {
    const [lessons, generations, classes, teachers, terms] = await Promise.all([
      getScheduledLessons(profile.school_id),
      getTimetableGenerations(profile.school_id),
      getClassesForSchool(profile.school_id),
      getTeachersForSchool(profile.school_id),
      getTermsForSchool(profile.school_id)
    ]);

    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Timetables</h1>
          <p className="text-gray-600 mt-2">
            View and manage the generated timetables for your school.
          </p>
        </div>

        <TimetablesClientUI
          initialLessons={lessons}
          initialGenerations={generations}
          initialClasses={classes}
          initialTeachers={teachers}
          initialTerms={terms}
          schoolId={profile.school_id}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading timetable data:', error);
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Timetables</h1>
          <p className="text-gray-600 mt-2">
            View and manage the generated timetables for your school.
          </p>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h2 className="text-yellow-800 font-semibold">Data Loading Issue</h2>
          <p className="text-yellow-600 mb-4">
            There was an issue loading some timetable data. This might be because:
          </p>
          <ul className="text-yellow-600 list-disc list-inside mb-4">
            <li>No timetable data has been generated yet</li>
            <li>Some required data (classes, teachers, terms) hasn't been set up</li>
            <li>There's a temporary connection issue</li>
          </ul>
          <p className="text-yellow-600">
            You can still use the timetable view, but some features may be limited.
          </p>
        </div>

        <TimetablesClientUI
          initialLessons={[]}
          initialGenerations={[]}
          initialClasses={[]}
          initialTeachers={[]}
          initialTerms={[]}
          schoolId={profile.school_id}
        />
      </div>
    );
  }
} 