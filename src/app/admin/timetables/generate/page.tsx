import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Container, Title, Text, Stack, Alert, Button, Group } from '@mantine/core';
import { IconArrowLeft, IconRocket } from '@tabler/icons-react';
import Link from 'next/link';
import TimetableGenerationClientUI from './_components/TimetableGenerationClientUI';
import { 
  getClassesForSchoolServer,
  getTeachersForSchoolServer,
  getDepartmentsForSchoolServer,
  getTermsForSchoolServer
} from '@/lib/api/timetables-legacy';
import { 
  getCurriculumConsistencyReport,
  validateTeacherWorkload
} from '@/lib/api/timetables-simple-server';

export default async function TimetableGenerationPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile to check role and school
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error">
          Error loading user profile. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  if (profile.role !== 'admin') {
    redirect('/unauthorized');
  }

  if (!profile.school_id) {
    return (
      <Container size="xl" py="md">
        <Alert color="blue" title="Setup Required">
          You need to complete the initial setup for your school before you can generate timetables.
          <Group mt="md">
            <Button component={Link} href="/admin/onboarding" leftSection={<IconRocket size={16} />}>
              Complete Setup
            </Button>
          </Group>
        </Alert>
      </Container>
    );
  }

  // Fetch initial data for the generation page
  try {
    const [classes, teachers, terms, curriculumReport, workloadReport] = await Promise.all([
      getClassesForSchoolServer(profile.school_id),
      getTeachersForSchoolServer(profile.school_id),
      getTermsForSchoolServer(profile.school_id),
      getCurriculumConsistencyReport(profile.school_id),
      validateTeacherWorkload(profile.school_id)
    ]);

    // Get school configuration
    const { data: schoolConfig } = await supabase
      .from('schools')
      .select('name, period_duration, sessions_per_day, working_days')
      .eq('id', profile.school_id)
      .single();

    return (
      <Container size="xl" py="md">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={1}>Generate Timetable</Title>
              <Text c="dimmed" mt="xs">
                Create optimized timetables using AI algorithms with your school's constraints and preferences.
              </Text>
            </div>
            <Button 
              component={Link} 
              href="/admin/timetables" 
              variant="subtle" 
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Timetables
            </Button>
          </Group>

          <TimetableGenerationClientUI
            schoolId={profile.school_id}
            schoolName={schoolConfig?.name || 'School'}
            initialData={{
              classes,
              teachers,
              terms,
              curriculumReport,
              workloadReport,
              schoolConfig: {
                periodDuration: schoolConfig?.period_duration || 45,
                sessionsPerDay: schoolConfig?.sessions_per_day || 8,
                workingDays: schoolConfig?.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
              }
            }}
          />
        </Stack>
      </Container>
    );
  } catch (error) {
    console.error('Error loading timetable generation data:', error);
    return (
      <Container size="xl" py="md">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={1}>Generate Timetable</Title>
              <Text c="dimmed" mt="xs">
                Create optimized timetables using AI algorithms with your school's constraints and preferences.
              </Text>
            </div>
            <Button 
              component={Link} 
              href="/admin/timetables" 
              variant="subtle" 
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Timetables
            </Button>
          </Group>

          <Alert color="yellow" title="Data Loading Issue">
            There was an issue loading some data required for timetable generation. This might be because:
            <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
              <li>No classes, teachers, or terms have been set up yet</li>
              <li>Some required data relationships are missing</li>
              <li>There's a temporary connection issue</li>
            </ul>
            <Text mt="md" size="sm">
              Please ensure all required data is configured before generating timetables.
            </Text>
          </Alert>

          <TimetableGenerationClientUI
            schoolId={profile.school_id}
            schoolName="School"
            initialData={{
              classes: [],
              teachers: [],
              terms: [],
              curriculumReport: [],
              workloadReport: [],
              schoolConfig: {
                periodDuration: 45,
                sessionsPerDay: 8,
                workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
              }
            }}
          />
        </Stack>
      </Container>
    );
  }
} 