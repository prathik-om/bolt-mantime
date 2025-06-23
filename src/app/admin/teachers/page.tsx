import { createClient } from "@/utils/supabase/server";
import { Container, Title, Text, Stack, Alert } from "@mantine/core";
import TeachersClientUI from "./_components/TeachersClientUI";

export default async function TeachersPage() {
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
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="No School Assigned">
          No school assigned. Please complete onboarding first.
        </Alert>
      </Container>
    );
  }

  try {
    // Fetch basic teachers data
    const { data: teachers, error: teachersError } = await supabase
      .from("teachers")
      .select("*")
      .eq("school_id", schoolId)
      .order("first_name", { ascending: true });

    if (teachersError) {
      throw teachersError;
    }

    return (
      <Container size="xl" py="md">
        <Stack gap="lg">
          <div>
            <Title order={1}>Teacher Management</Title>
            <Text c="dimmed" mt="xs">
              Manage teachers and their basic information.
            </Text>
          </div>
          
          <TeachersClientUI 
            schoolId={schoolId} 
            initialTeachers={teachers || []}
          />
        </Stack>
      </Container>
    );
  } catch (error) {
    console.error("Error loading teachers page:", error);
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error Loading Teachers">
          Failed to load teachers. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }
} 