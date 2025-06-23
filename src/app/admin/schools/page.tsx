import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Container, Alert } from "@mantine/core";
import SchoolsClientWrapper from "./_components/SchoolsClientWrapper";

export default async function SchoolsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Authentication Error">
          Please log in to access this page.
        </Alert>
      </Container>
    );
  }

  // Get user profile to check role and school
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
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

  // Check if user is admin
  if (profile.role !== "admin") {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Access Denied">
          Admin privileges required to access this page.
        </Alert>
      </Container>
    );
  }

  // Get school ID from profile
  const schoolId = profile.school_id;
  if (!schoolId) {
    redirect('/admin/onboarding');
  }

  // Fetch school data
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .single();

  if (schoolError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading school data. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  // Fetch academic years
  const { data: academicYears, error: academicYearsError } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  // Fetch terms
  const { data: terms, error: termsError } = await supabase
    .from("terms")
    .select(`
      *,
      academic_years (
        id,
        name
      )
    `)
    .eq("academic_years.school_id", schoolId)
    .order("start_date", { ascending: false });

  return (
    <SchoolsClientWrapper
      school={school}
      academicYears={academicYears || []}
      terms={(terms || []) as any}
      academicYearsError={academicYearsError}
      termsError={termsError}
    />
  );
}