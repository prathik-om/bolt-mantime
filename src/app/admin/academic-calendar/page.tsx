import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AcademicCalendarClientUI from './_components/AcademicCalendarClientUI';
import { Title, Text, Container, Stack, Alert } from '@mantine/core';

export default async function AcademicCalendarPage() {
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

  if (profileError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading user profile. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Profile Not Found">
          User profile not found. Please contact an administrator.
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
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="No School Assigned">
          No school assigned. Please complete onboarding first.
        </Alert>
      </Container>
    );
  }

  // Fetch academic years with their terms for the user's school
  const { data: academicYearsWithTerms, error } = await supabase
    .from('academic_years')
    .select(`
      id,
      name,
      start_date,
      end_date,
      school_id,
      terms (
        id,
        name,
        start_date,
        end_date,
        academic_year_id,
        period_duration_minutes
      )
    `)
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error("Error fetching academic years:", error);
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading academic calendar data. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={1}>Academic Calendar</Title>
          <Text c="dimmed" mt="xs">
            Manage academic years and terms for your school. Academic years define the overall time periods, while terms break them down into specific scheduling periods.
          </Text>
        </div>
        
        <AcademicCalendarClientUI 
          initialAcademicYears={academicYearsWithTerms || []} 
          schoolId={schoolId}
        />
      </Stack>
    </Container>
  );
} 