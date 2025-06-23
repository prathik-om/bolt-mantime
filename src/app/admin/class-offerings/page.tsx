import { createClient } from "@/utils/supabase/server";
import { Container, Title, Text, Stack, Alert, Button, Card, Group } from "@mantine/core";
import { IconArrowLeft, IconBook, IconClock, IconSchool, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { ClassOfferingsClientUI } from "./_components/ClassOfferingsClientUI";

export default async function ClassOfferingsPage() {
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

  // Fetch class offerings with related data
  const { data: classOfferings, error: offeringsError } = await supabase
    .from("class_offerings")
    .select(`
      *,
      courses (
        id,
        name,
        code,
        grade_level,
        departments (
          id,
          name
        )
      ),
      class_sections (
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
    `)
    .order("created_at", { ascending: false });

  if (offeringsError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading class offerings. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  // Fetch courses for the form
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select(`
      *,
      departments (
        id,
        name
      )
    `)
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (coursesError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading courses. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  // Fetch classes for the form
  const { data: classes, error: classesError } = await (supabase as any)
    .from("class_sections")
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

  // Fetch terms for the form
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
    .order("start_date", { ascending: true });

  if (termsError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading terms. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  // Fetch teachers for assignment status
  const { data: teachers, error: teachersError } = await supabase
    .from("teachers")
    .select("*")
    .eq("school_id", schoolId)
    .order("first_name", { ascending: true });

  if (teachersError) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading teachers. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  // Fetch related data for stats
  const { count: coursesCount } = await supabase
    .from("courses")
    .select("id", { count: 'exact', head: true })
    .eq("school_id", schoolId);

  const { count: classesCount } = await (supabase as any)
    .from("class_sections")
    .select("id", { count: 'exact', head: true })
    .eq("school_id", schoolId);

  // Calculate total periods
  const totalPeriods = classOfferings?.length || 0;

  // Filter out invalid class offerings before passing to the client UI
  const validClassOfferings = (classOfferings || []).filter(
    (offering) =>
      offering.class_sections &&
      typeof offering.class_sections === "object" &&
      !('error' in offering.class_sections) &&
      "id" in offering.class_sections &&
      "name" in offering.class_sections &&
      "grade_level" in offering.class_sections
  );

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
          
          <Title order={1}>Class Offerings</Title>
          <Text c="dimmed" mt="xs">
            Manage class offerings for each term. Class offerings define which courses are taught to which sections during specific terms.
          </Text>
        </div>

        {/* Stats Cards */}
        <Group grow>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconSchool size={24} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="lg" fw={600}>{validClassOfferings.length || 0}</Text>
                <Text size="sm" c="dimmed">Total Offerings</Text>
              </div>
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconClock size={24} color="var(--mantine-color-green-6)" />
              <div>
                <Text size="lg" fw={600}>{totalPeriods}</Text>
                <Text size="sm" c="dimmed">Total Offerings</Text>
              </div>
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconBook size={24} color="var(--mantine-color-purple-6)" />
              <div>
                <Text size="lg" fw={600}>{coursesCount || 0}</Text>
                <Text size="sm" c="dimmed">Available Courses</Text>
              </div>
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconUsers size={24} color="var(--mantine-color-orange-6)" />
              <div>
                <Text size="lg" fw={600}>{classesCount || 0}</Text>
                <Text size="sm" c="dimmed">Classes</Text>
              </div>
            </Group>
          </Card>
        </Group>

        {/* Class Offerings Management */}
        <ClassOfferingsClientUI 
          initialClassOfferings={validClassOfferings as any} 
          courses={courses || []}
          allClasses={classes || []}
          terms={terms || []}
          teachers={teachers || []}
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
              href="/admin/classes"
            >
              Class Sections
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
} 