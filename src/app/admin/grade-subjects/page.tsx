"use client";

import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import GradeSubjectsClientUI from './_components/GradeSubjectsClientUI';

export default async function GradeSubjectsPage() {
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

  // Fetch existing grade-subject mappings
  const { data: mappings, error: mappingsError } = await supabase
    .from('grade_subjects')
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
    .eq('school_id', profile.school_id);

  if (mappingsError) {
    throw new Error(`Error loading grade-subject mappings: ${mappingsError.message}`);
  }

  return (
    <div className="container mx-auto py-8">
      <GradeSubjectsClientUI
        schoolId={profile.school_id}
        subjects={subjects || []}
        grades={grades || []}
        initialMappings={mappings || []}
      />
    </div>
  );
} 