"use client";

import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherQualificationsClientUI from './_components/TeacherQualificationsClientUI';

export default async function TeacherQualificationsPage() {
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

  // Fetch teachers
  const { data: teachers, error: teachersError } = await supabase
    .from('teachers')
    .select('*')
    .eq('school_id', profile.school_id)
    .order('last_name');

  if (teachersError) {
    throw new Error(`Error loading teachers: ${teachersError.message}`);
  }

  // Fetch subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('*')
    .eq('school_id', profile.school_id)
    .order('name');

  if (subjectsError) {
    throw new Error(`Error loading subjects: ${subjectsError.message}`);
  }

  // Fetch grades
  const { data: grades, error: gradesError } = await supabase
    .from('grades')
    .select('*')
    .order('grade_level');

  if (gradesError) {
    throw new Error(`Error loading grades: ${gradesError.message}`);
  }

  // Fetch existing qualifications
  const { data: qualifications, error: qualificationsError } = await supabase
    .from('teacher_subject_qualifications')
    .select(`
      *,
      subjects (
        id,
        name,
        code
      ),
      grades (
        id,
        grade_name
      )
    `)
    .eq('teacher_id', 'in', (teachers || []).map(t => t.id));

  if (qualificationsError) {
    throw new Error(`Error loading qualifications: ${qualificationsError.message}`);
  }

  return (
    <div className="container mx-auto py-8">
      <TeacherQualificationsClientUI
        schoolId={profile.school_id}
        teachers={teachers || []}
        subjects={subjects || []}
        grades={grades || []}
        initialQualifications={qualifications || []}
      />
    </div>
  );
} 