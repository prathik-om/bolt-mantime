import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TeachingAssignmentsClientUI from "./_components/TeachingAssignmentsClientUI";

export default async function TeachingAssignmentsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile to check role and school
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  // Check if user is admin
  if (profile.role !== "admin") {
    redirect('/unauthorized');
  }

  // Get school ID from profile
  const schoolId = profile.school_id;
  if (!schoolId) {
    redirect('/admin/onboarding');
  }

  try {
    // Fetch initial data for stats
    const { count: assignmentsCount } = await supabase
      .from("teaching_assignments")
      .select("id", { count: 'exact', head: true })
      .eq("school_id", schoolId);

    const { count: teachersCount } = await supabase
      .from("teachers")
      .select("id", { count: 'exact', head: true })
      .eq("school_id", schoolId);

    const { count: coursesCount } = await supabase
      .from("courses")
      .select("id", { count: 'exact', head: true })
      .eq("school_id", schoolId);

    const { count: classOfferingsCount } = await supabase
      .from("class_offerings")
      .select("id", { count: 'exact', head: true })
      .eq("school_id", schoolId);

    return (
      <TeachingAssignmentsClientUI 
        schoolId={schoolId}
        initialStats={{
          assignmentsCount: assignmentsCount || 0,
          teachersCount: teachersCount || 0,
          coursesCount: coursesCount || 0,
          classOfferingsCount: classOfferingsCount || 0
        }}
      />
    );
  } catch (error) {
    console.error('Error loading teaching assignments page:', error);
    redirect('/admin/dashboard');
  }
} 