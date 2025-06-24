import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Container, Title, Text, Stack, Alert } from "@mantine/core";
import DashboardClientUI from "./_components/DashboardClientUI";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Check authentication using getUser for security
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('Dashboard - User check:', { user: !!user, error: userError?.message });
  
  if (userError || !user) {
    console.log('Dashboard - Redirecting to login due to user error');
    redirect('/login');
  }

  // Get user profile to check role and school
  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle(); // Use maybeSingle to avoid errors when no profile exists

  console.log('Dashboard - Profile check:', { profile: !!profile, error: profileError?.message });

  // If no profile exists, redirect to onboarding (don't try to create one here)
  if (!profile) {
    console.log('Dashboard - No profile found, redirecting to onboarding');
    redirect('/admin/onboarding');
  }

  // Check if user is admin
  if (profile.role !== "admin") {
    console.log('Dashboard - User is not admin:', profile.role);
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
    console.log('Dashboard - No school assigned to user, redirecting to onboarding');
    redirect('/admin/onboarding');
  }

  console.log('Dashboard - User authenticated successfully:', { userId: user.id, schoolId });

  // Fetch dashboard data
  try {
    const [
      { count: teachers },
      { count: subjects },
      { count: classes }
    ] = await Promise.all([
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('departments').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      (supabase as any).from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId)
    ]);

    const dashboardData = {
      teachers: teachers || 0,
      subjects: subjects || 0,
      classes: classes || 0,
      timetableEntries: 0 // Placeholder since scheduled_lessons table doesn't exist
    };

    return (
      <Container size="xl" py="md">
        <Stack gap="lg">
          <div>
            <Title order={1}>School Dashboard</Title>
            <Text c="dimmed" mt="xs">
              Overview of your school's timetable management system.
            </Text>
          </div>
          
          <DashboardClientUI 
            initialData={dashboardData}
            schoolId={schoolId}
          />
        </Stack>
      </Container>
    );
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading dashboard data. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }
} 