"use client";

import React, { useState } from 'react';
import {
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  NumberInput,
  Switch,
  Alert,
  Divider,
} from '@mantine/core';
import { IconSettings, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createClient } from '@/utils/supabase/client';

interface SchoolConfig {
  periodDuration: number;
  sessionsPerDay: number;
  workingDays: string[];
  maxLessonsPerDay?: number;
  minLessonsPerDay?: number;
  maxConsecutiveLessons?: number;
  breakRequired?: boolean;
}

interface Props {
  schoolId: string;
  schoolConfig: SchoolConfig;
}

export default function SchoolWideConstraintsTab({ schoolId, schoolConfig }: Props) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const form = useForm({
    initialValues: {
      maxLessonsPerDay: schoolConfig.maxLessonsPerDay || schoolConfig.sessionsPerDay || 8,
      minLessonsPerDay: schoolConfig.minLessonsPerDay || 1,
      maxConsecutiveLessons: schoolConfig.maxConsecutiveLessons || 2,
      breakRequired: schoolConfig.breakRequired ?? true,
    },
    validate: {
      maxLessonsPerDay: (value) => (value < 1 ? 'Must be at least 1' : null),
      minLessonsPerDay: (value) => (value < 0 ? 'Cannot be negative' : null),
      maxConsecutiveLessons: (value) => (value < 1 ? 'Must be at least 1' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          max_lessons_per_day: values.maxLessonsPerDay,
          min_lessons_per_day: values.minLessonsPerDay,
          max_consecutive_lessons: values.maxConsecutiveLessons,
          break_required: values.breakRequired,
        })
        .eq('id', schoolId);
      if (error) throw error;
      notifications.show({ title: 'Success', message: 'School-wide rules updated', color: 'green' });
    } catch (error: any) {
      notifications.show({ title: 'Error', message: error.message || 'Failed to update rules', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card withBorder>
      <Title order={2} mb="xs">School-Wide Scheduling Rules</Title>
      <Text c="dimmed" mb="md">Set global constraints that apply to all timetable generations for this school.</Text>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <NumberInput
            label="Maximum Lessons Per Day"
            min={1}
            max={20}
            {...form.getInputProps('maxLessonsPerDay')}
            required
          />
          <NumberInput
            label="Minimum Lessons Per Day"
            min={0}
            max={20}
            {...form.getInputProps('minLessonsPerDay')}
            required
          />
          <NumberInput
            label="Maximum Consecutive Lessons"
            min={1}
            max={10}
            {...form.getInputProps('maxConsecutiveLessons')}
            required
          />
          <Switch
            label="Break Required Between Sessions"
            {...form.getInputProps('breakRequired', { type: 'checkbox' })}
          />
          <Group justify="flex-end" mt="md">
            <Button type="submit" loading={loading} leftSection={<IconSettings size={16} />}>Save Rules</Button>
          </Group>
        </Stack>
      </form>
      <Divider my="md" />
      <Alert icon={<IconCheck size={16} />} color="blue" mt="md">
        These rules will be enforced for all timetable generations. For more advanced constraints, use the Teacher Constraints or Templates tabs.
      </Alert>
    </Card>
  );
} 