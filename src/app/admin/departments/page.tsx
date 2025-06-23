import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Container, Alert } from "@mantine/core";
import DepartmentsClientWrapper from "./_components/DepartmentsClientWrapper";
import { getDepartmentsWithStats } from "@/lib/api/departments-server";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Authentication Error">
          Please log in to access this page.
        </Alert>
      </Container>
    );
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Profile Error">
          Error loading user profile. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Access Denied">
          Admin privileges required to access this page.
        </Alert>
      </Container>
    );
  }

  if (!profile.school_id) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="No School Assigned">
          No school assigned. Please complete onboarding first.
        </Alert>
      </Container>
    );
  }

  const schoolId = profile.school_id;

  try {
    // Get departments with stats using the server-side API function
    const departments = await getDepartmentsWithStats(schoolId);
    
    // Get total counts for the school
    const [
      { count: totalTeachers },
      { count: totalCourses }
    ] = await Promise.all([
      supabase.from("teachers").select('*', { count: 'exact', head: true }).eq("school_id", schoolId),
      supabase.from("courses").select('*', { count: 'exact', head: true }).eq("school_id", schoolId)
    ]);

    return (
      <DepartmentsClientWrapper
        departments={departments}
        schoolId={schoolId}
        totalTeachers={totalTeachers || 0}
        totalCourses={totalCourses || 0}
      />
    );
  } catch (error) {
    console.error("Error loading departments page:", error);
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          There was a problem loading the departments data. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }
} 