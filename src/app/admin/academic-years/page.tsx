import { createClient } from "@/utils/supabase/server";
import { Container, Title, Text, Stack, Alert, Button } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import AcademicYearsClientUI from "./_components/AcademicYearsClientUI";

export default async function AcademicYearsPage() {
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

  // Fetch academic years
  const { data: academicYears, error: academicYearsError } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  if (academicYearsError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading academic years. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            component={Link}
            href="/admin/schools"
            mb="md"
          >
            Back to School Configuration
          </Button>
          
          <Title order={1}>Academic Years</Title>
          <Text c="dimmed" mt="xs">
            Manage academic years for your school. Academic years define the overall structure of your school calendar.
          </Text>
        </div>

        <AcademicYearsClientUI 
          initialAcademicYears={academicYears || []} 
          schoolId={schoolId} 
        />
      </Stack>
    </Container>
  );
} 