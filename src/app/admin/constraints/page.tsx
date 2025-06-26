import { Container, Title, Text, Stack, Group, Button, Card, Grid, Badge, Alert } from '@mantine/core';
import { IconBrain, IconClock, IconSettings, IconAlertTriangle } from '@tabler/icons-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ConstraintManagementClientUI from './_components/ConstraintManagementClientUI';

export default async function ConstraintManagementPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get user profile and check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/unauthorized');
  }

  if (!profile.school_id) {
    redirect('/admin/setup-school');
  }

  // Fetch initial data for constraint management
  try {
    const [teachers, timeSlots, teacherConstraints] = await Promise.all([
      supabase
        .from('teachers')
        .select('id, first_name, last_name, email, max_periods_per_week')
        .eq('school_id', profile.school_id)
        .order('first_name'),
      supabase
        .from('time_slots')
        .select('id, day_of_week, start_time, end_time, period_number, is_teaching_period')
        .eq('school_id', profile.school_id)
        .eq('is_teaching_period', true)
        .order('day_of_week, start_time'),
      supabase
        .from('teacher_time_constraints')
        .select(`
          id,
          teacher_id,
          time_slot_id,
          constraint_type,
          reason,
          priority,
          teachers!inner(first_name, last_name),
          time_slots!inner(day_of_week, start_time, end_time)
        `)
        .eq('teachers.school_id', profile.school_id)
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
              <Title order={1}>Constraint Management</Title>
              <Text c="dimmed" mt="xs">
                Manage teacher time constraints, school-wide preferences, and scheduling rules.
              </Text>
            </div>
            <Button 
              component={Link} 
              href="/admin/dashboard" 
              variant="subtle" 
              leftSection={<IconSettings size={16} />}
            >
              Back to Admin
            </Button>
          </Group>

          <ConstraintManagementClientUI
            schoolId={profile.school_id}
            schoolName={schoolConfig?.name || 'School'}
            initialData={{
              teachers: teachers.data || [],
              timeSlots: timeSlots.data || [],
              teacherConstraints: teacherConstraints.data || [],
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
    console.error('Error loading constraint management data:', error);
    return (
      <Container size="xl" py="md">
        <Alert icon={<IconAlertTriangle size={16} />} title="Error" color="red">
          Failed to load constraint management data. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }
} 