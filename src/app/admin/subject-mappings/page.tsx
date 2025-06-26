import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Text } from '@mantine/core';
import SubjectMappingsClientUI from './_components/SubjectMappingsClientUI';

export default async function SubjectMappingsPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  // Check if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (!session || sessionError) {
    redirect('/login');
  }

  // Get user's school_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile?.school_id) {
    redirect('/create-school');
  }

  // Fetch subjects with their class offerings (new single source of truth)
  const { data: subjectsWithOfferings, error: subjectsError } = await supabase
    .from("subjects")
    .select(`
      id,
      name,
      code,
      department_id,
      departments (
        id,
        name
      ),
      class_offerings (
        id,
        class_id,
        periods_per_week,
        required_hours_per_term,
        term_id,
        classes (
          id,
          name,
          grade_id,
          section
        )
      )
    `)
    .eq('school_id', profile.school_id)
    .order('name');

  if (subjectsError) {
    throw new Error(`Error loading subjects: ${subjectsError.message}`);
  }

  // Fetch departments
  const { data: departments, error: departmentsError } = await supabase
    .from('departments')
    .select('*')
    .eq('school_id', profile.school_id)
    .order('name');

  if (departmentsError) {
    throw new Error(`Error loading departments: ${departmentsError.message}`);
  }

  // Calculate statistics
  const totalSubjects = subjectsWithOfferings?.length || 0;
  const totalOfferings = subjectsWithOfferings?.reduce((acc: number, subject: any) =>
    acc + (subject.class_offerings?.length || 0), 0);
  const subjectsWithMultipleClasses = subjectsWithOfferings?.filter((subject: any) =>
    (subject.class_offerings?.length || 0) > 1).length || 0;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Subject Mappings</h1>
        <p className="text-gray-600">
          View and manage which subjects are available for which grades and class sections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <Text size="lg" fw={600}>{totalSubjects}</Text>
          <Text size="sm" c="dimmed">Total Subjects</Text>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <Text size="lg" fw={600}>{totalOfferings}</Text>
          <Text size="sm" c="dimmed">Total Class Offerings</Text>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <Text size="lg" fw={600}>{subjectsWithMultipleClasses}</Text>
          <Text size="sm" c="dimmed">Multi-Class Subjects</Text>
        </div>
      </div>

      <SubjectMappingsClientUI
        schoolId={profile.school_id}
        subjectsWithOfferings={subjectsWithOfferings || []}
        departments={departments || []}
      />
    </div>
  );
} 