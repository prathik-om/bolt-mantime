import { createClient } from "@/utils/supabase/server";
import { Container, Title, Text, Stack, Alert, Card, Group } from "@mantine/core";
import { IconArrowLeft, IconBook, IconUsers, IconSchool } from "@tabler/icons-react";
import Link from "next/link";

export default async function TestDepartmentsPage() {
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

  // Get user's school
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single();

  if (!profile?.school_id) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="School Not Found">
          Please set up your school first.
        </Alert>
      </Container>
    );
  }

  const schoolId = profile.school_id;

  // Test departments (departments table)
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*')
    .eq('school_id', schoolId);

  // Test subjects (courses table)
  const { data: subjects, error: subjectsError } = await supabase
    .from('courses')
    .select('*')
    .eq('school_id', schoolId);

  // Test teacher_departments table
  const { data: teacherDepartments, error: tdError } = await supabase
    .from('teacher_departments')
    .select('*');

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Group>
          <Link href="/admin/departments">
            <IconArrowLeft size={20} />
          </Link>
          <Title order={1}>Test Departments to Subjects Mapping</Title>
        </Group>

        <Card p="md">
          <Title order={3} mb="md">Database Structure Test</Title>
          
          <Stack gap="md">
            <div>
              <Text fw={600}>Departments (departments table):</Text>
              <Text size="sm" c="dimmed">
                {deptError ? `Error: ${deptError.message}` : `Found ${departments?.length || 0} departments`}
              </Text>
              {departments && departments.length > 0 && (
                <Text size="sm">
                  Sample: {departments[0].name} (ID: {departments[0].id})
                </Text>
              )}
            </div>

            <div>
              <Text fw={600}>Subjects (courses table):</Text>
              <Text size="sm" c="dimmed">
                {subjectsError ? `Error: ${subjectsError.message}` : `Found ${subjects?.length || 0} subjects`}
              </Text>
              {subjects && subjects.length > 0 && (
                <Text size="sm">
                  Sample: {subjects[0].name} (Department ID: {subjects[0].department_id})
                </Text>
              )}
            </div>

            <div>
              <Text fw={600}>Teacher Departments:</Text>
              <Text size="sm" c="dimmed">
                {tdError ? `Error: ${tdError.message}` : `Found ${teacherDepartments?.length || 0} teacher-department relationships`}
              </Text>
              {teacherDepartments && teacherDepartments.length > 0 && (
                <Text size="sm">
                  Sample: Teacher {teacherDepartments[0].teacher_id} → Department {teacherDepartments[0].department_id}
                </Text>
              )}
            </div>
          </Stack>
        </Card>

        <Card p="md">
          <Title order={3} mb="md">Relationship Test</Title>
          
          {departments && subjects && (
            <Stack gap="md">
              {departments.map(dept => {
                const deptSubjects = subjects.filter(subject => subject.department_id === dept.id);
                return (
                  <div key={dept.id}>
                    <Text fw={600}>{dept.name} (Department)</Text>
                    <Text size="sm" c="dimmed">
                      Has {deptSubjects.length} subjects: {deptSubjects.map(s => s.name).join(', ') || 'None'}
                    </Text>
                  </div>
                );
              })}
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
} 