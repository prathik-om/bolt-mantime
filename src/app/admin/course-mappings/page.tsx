import { createClient } from "@/utils/supabase/server";
import { Container, Title, Text, Stack, Alert, Group, Card, Button } from "@mantine/core";
import { IconArrowLeft, IconBook, IconSchool, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { CourseMappingsClientUI } from "./_components/CourseMappingsClientUI";

export default async function CourseMappingsPage() {
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
    // Fetch courses with their class offerings (new single source of truth)
    const { data: coursesWithOfferings, error: coursesError } = await (supabase as any)
      .from("courses")
      .select(`
        *,
        departments (*),
        class_offerings (
          id,
          term_id,
          class_id,
          periods_per_week,
          required_hours_per_term,
          classes (
            id,
            name,
            grade_level
          ),
          terms (
            id,
            name,
            academic_years (
              id,
              name
            )
          )
        )
      `)
      .eq("school_id", schoolId)
      .order("name", { ascending: true });

    if (coursesError) {
      return (
        <Container size="xl" py="md">
          <Alert color="red" title="Error">
            Error loading course offerings. Please try refreshing the page.
          </Alert>
        </Container>
      );
    }

    // Fetch classes for reference
    const { data: classes, error: classesError } = await (supabase as any)
      .from("classes")
      .select("*")
      .eq("school_id", schoolId)
      .order("grade_level", { ascending: true })
      .order("name", { ascending: true });

    if (classesError) {
      return (
        <Container size="xl" py="md">
          <Alert color="red" title="Error">
            Error loading classes. Please try refreshing the page.
          </Alert>
        </Container>
      );
    }

    // Fetch departments for the form
    const { data: departments, error: departmentsError } = await supabase
      .from("departments")
      .select("*")
      .eq("school_id", schoolId)
      .order("name", { ascending: true });

    if (departmentsError) {
      return (
        <Container size="xl" py="md">
          <Alert color="red" title="Error">
            Error loading departments. Please try refreshing the page.
          </Alert>
        </Container>
      );
    }

    // Calculate stats
    const totalCourses = coursesWithOfferings?.length || 0;
    const totalOfferings = coursesWithOfferings?.reduce((acc: number, course: any) => 
      acc + (course.class_offerings?.length || 0), 0
    ) || 0;
    const coursesWithMultipleClasses = coursesWithOfferings?.filter((course: any) => 
      (course.class_offerings?.length || 0) > 1
    ).length || 0;

    return (
      <Container size="xl" py="md">
        <Stack gap="lg">
          <div>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              component={Link}
              href="/admin/dashboard"
              mb="md"
            >
              Back to Dashboard
            </Button>
            
            <Title order={1}>Course-Grade Mappings</Title>
            <Text c="dimmed" mt="xs">
              View and manage which courses are available for which grades and class sections.
            </Text>
          </div>

          {/* Stats Cards */}
          <Group grow>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group>
                <IconBook size={24} color="var(--mantine-color-blue-6)" />
                <div>
                  <Text size="lg" fw={600}>{totalCourses}</Text>
                  <Text size="sm" c="dimmed">Total Courses</Text>
                </div>
              </Group>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group>
                <IconSchool size={24} color="var(--mantine-color-green-6)" />
                <div>
                  <Text size="lg" fw={600}>{totalOfferings}</Text>
                  <Text size="sm" c="dimmed">Total Offerings</Text>
                </div>
              </Group>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group>
                <IconUsers size={24} color="var(--mantine-color-purple-6)" />
                <div>
                  <Text size="lg" fw={600}>{coursesWithMultipleClasses}</Text>
                  <Text size="sm" c="dimmed">Multi-Class Courses</Text>
                </div>
              </Group>
            </Card>
          </Group>
          
          <CourseMappingsClientUI 
            coursesWithOfferings={coursesWithOfferings || []}
            classes={classes || []}
            departments={departments || []}
            schoolId={schoolId}
          />

          {/* Quick Actions */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">Quick Actions</Title>
            <Group>
              <Button 
                variant="light" 
                leftSection={<IconBook size={16} />}
                component={Link}
                href="/admin/subjects"
              >
                Manage Subjects
              </Button>
              <Button 
                variant="light" 
                leftSection={<IconSchool size={16} />}
                component={Link}
                href="/admin/class-offerings"
              >
                Class Offerings
              </Button>
              <Button 
                variant="light" 
                leftSection={<IconUsers size={16} />}
                component={Link}
                href="/admin/classes"
              >
                Manage Classes
              </Button>
            </Group>
          </Card>
        </Stack>
      </Container>
    );
  } catch (error) {
    console.error("Error loading course mappings page:", error);
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error Loading Course Mappings">
          Failed to load course mappings. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }
} 