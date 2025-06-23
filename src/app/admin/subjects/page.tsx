import { createClient } from "@/utils/supabase/server";
import { Container, Title, Text, Stack, Alert, Group, Card, Button } from "@mantine/core";
import { IconArrowLeft, IconBook, IconBook2, IconUsers, IconSchool } from "@tabler/icons-react";
import Link from "next/link";
import { SubjectsClientUI } from "./_components/SubjectsClientUI";

export default async function SubjectsPage() {
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
    // Fetch subjects with departments
    const { data: subjects, error: subjectsError } = await supabase
      .from("courses")
      .select(`
        *,
        departments (*)
      `)
      .eq("school_id", schoolId)
      .order("name", { ascending: true });

    if (subjectsError) {
      return (
        <Container size="xl" py="md">
          <Alert color="red" title="Error">
            Error loading subjects. Please try refreshing the page.
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

    // Fetch classes for class offerings
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

    // Fetch related data for stats
    const { count: departmentsCount } = await supabase
      .from("departments")
      .select("id", { count: 'exact', head: true })
      .eq("school_id", schoolId);

    const { count: classOfferings } = await supabase
      .from("class_offerings")
      .select("id", { count: 'exact', head: true });

    const { count: teachers } = await supabase
      .from("teachers")
      .select("id", { count: 'exact', head: true })
      .eq("school_id", schoolId);

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
            
            <Title order={1}>Subject Management</Title>
            <Text c="dimmed" mt="xs">
              Manage subjects, their departments, and grade level assignments.
            </Text>
          </div>

          {/* Stats Cards */}
          <Group grow>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group>
                <IconBook size={24} color="var(--mantine-color-blue-6)" />
                <div>
                  <Text size="lg" fw={600}>{subjects?.length || 0}</Text>
                  <Text size="sm" c="dimmed">Total Subjects</Text>
                </div>
              </Group>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group>
                <IconBook2 size={24} color="var(--mantine-color-green-6)" />
                <div>
                  <Text size="lg" fw={600}>{departmentsCount || 0}</Text>
                  <Text size="sm" c="dimmed">Departments</Text>
                </div>
              </Group>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group>
                <IconSchool size={24} color="var(--mantine-color-purple-6)" />
                <div>
                  <Text size="lg" fw={600}>{classOfferings || 0}</Text>
                  <Text size="sm" c="dimmed">Class Offerings</Text>
                </div>
              </Group>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group>
                <IconUsers size={24} color="var(--mantine-color-orange-6)" />
                <div>
                  <Text size="lg" fw={600}>{teachers || 0}</Text>
                  <Text size="sm" c="dimmed">Teachers</Text>
                </div>
              </Group>
            </Card>
          </Group>
          
          <SubjectsClientUI 
            initialSubjects={subjects || []}
            departments={departments || []}
            classes={classes || []}
            schoolId={schoolId}
          />

          {/* Quick Actions */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">Quick Actions</Title>
            <Group>
              <Button 
                variant="light" 
                leftSection={<IconBook2 size={16} />}
                component={Link}
                href="/admin/departments"
              >
                Manage Departments
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
                href="/admin/teaching-assignments"
              >
                Teaching Assignments
              </Button>
            </Group>
          </Card>
        </Stack>
      </Container>
    );
  } catch (error) {
    console.error("Error loading subjects page:", error);
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error Loading Subjects">
          Failed to load subjects. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }
} 