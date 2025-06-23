import { createClient } from "@/utils/supabase/server";
import { Container, Title, Text, Stack, Alert, Button, Card, Group } from "@mantine/core";
import { IconArrowLeft, IconBook, IconSchool, IconUsers, IconCopy } from "@tabler/icons-react";
import Link from "next/link";
import { ClassesClientUI } from "./_components/ClassesClientUI";
import type { Database } from '@/types/database';

export default async function ClassesPage() {
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

  // Fetch class sections
  const { data: classSectionsRaw, error: sectionsError } = await (supabase as any)
    .from("classes")
    .select("*")
    .eq("school_id", schoolId)
    .order("grade_level", { ascending: true })
    .order("name", { ascending: true });

  if (sectionsError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading classes. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  const classSections: Database['public']['Tables']['classes']['Row'][] = classSectionsRaw || [];

  // Fetch related data for stats
  const { count: coursesCount } = await supabase
    .from("courses")
    .select("id", { count: 'exact', head: true })
    .eq("school_id", schoolId);

  const { count: classOfferings } = await supabase
    .from("class_offerings")
    .select("id", { count: 'exact', head: true });

  const { count: teachers } = await supabase
    .from("teachers")
    .select("id", { count: 'exact', head: true })
    .eq("school_id", schoolId);

  // Calculate grade level distribution
  const gradeLevels = classSections.map((section) => section.grade_level);
  const uniqueGradeLevels = Array.from(new Set(gradeLevels)).length;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
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
          
          <Title order={1}>Classes</Title>
          <Text c="dimmed" mt="xs">
            Manage classes and student groups for your school. Classes represent groups of students at the same grade level.
          </Text>
        </div>

        {/* Stats Cards */}
        <Group grow>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconUsers size={24} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="lg" fw={600}>{classSections?.length || 0}</Text>
                <Text size="sm" c="dimmed">Total Classes</Text>
              </div>
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconSchool size={24} color="var(--mantine-color-green-6)" />
              <div>
                <Text size="lg" fw={600}>{uniqueGradeLevels}</Text>
                <Text size="sm" c="dimmed">Grade Levels</Text>
              </div>
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconBook size={24} color="var(--mantine-color-purple-6)" />
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

        {/* Classes Management */}
        <ClassesClientUI 
          initialClassSections={classSections} 
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
              leftSection={<IconCopy size={16} />}
              component={Link}
              href="/admin/course-mappings"
            >
              Course Mappings
            </Button>
            <Button 
              variant="light" 
              leftSection={<IconUsers size={16} />}
              component={Link}
              href="/admin/teachers"
            >
              Manage Teachers
            </Button>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
} 