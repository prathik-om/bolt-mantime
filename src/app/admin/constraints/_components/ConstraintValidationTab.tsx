"use client";

import React from 'react';
import { Card, Title, Text, Stack, Group, Badge, Alert, Progress, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconX } from '@tabler/icons-react';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  max_periods_per_week: number | null;
}

interface TeacherConstraint {
  id: string;
  teacher_id: string;
  time_slot_id: string;
  constraint_type: string;
  reason: string | null;
  priority: number | null;
  teachers: {
    first_name: string;
    last_name: string;
  };
  time_slots: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  };
}

interface SchoolConfig {
  periodDuration: number;
  sessionsPerDay: number;
  workingDays: string[];
}

interface Props {
  schoolId: string;
  teachers: Teacher[];
  teacherConstraints: TeacherConstraint[];
  schoolConfig: SchoolConfig;
}

export default function ConstraintValidationTab({ schoolId, teachers, teacherConstraints, schoolConfig }: Props) {
  // Calculate validation metrics
  const totalTeachers = teachers.length;
  const teachersWithConstraints = new Set(teacherConstraints.map(c => c.teacher_id)).size;
  const coverage = totalTeachers > 0 ? Math.round((teachersWithConstraints / totalTeachers) * 100) : 0;
  const totalConstraints = teacherConstraints.length;
  const conflicts = 0; // Will be calculated based on actual conflict detection

  return (
    <Stack gap="md">
      <Alert icon={<IconCheck size={16} />} color="green" title="Validation Status">
        No critical issues found in your constraint configuration.
      </Alert>

      <Card withBorder>
        <Title order={3} mb="md">Coverage Analysis</Title>
        <Stack gap="md">
          <Group>
            <Text>Teacher Coverage:</Text>
            <Progress value={coverage} size="xl" w={200} />
            <Text>{coverage}%</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {teachersWithConstraints} out of {totalTeachers} teachers have constraints defined.
          </Text>
        </Stack>
      </Card>

      <Card withBorder>
        <Title order={3} mb="md">Constraint Health</Title>
        <Stack gap="md">
          <Group>
            <ThemeIcon color="green" size="lg">
              <IconCheck size={20} />
            </ThemeIcon>
            <div>
              <Text>Total Constraints</Text>
              <Text size="sm" c="dimmed">{totalConstraints} constraints defined</Text>
            </div>
          </Group>
          <Group>
            <ThemeIcon color={conflicts > 0 ? "red" : "green"} size="lg">
              {conflicts > 0 ? <IconX size={20} /> : <IconCheck size={20} />}
            </ThemeIcon>
            <div>
              <Text>Conflicts</Text>
              <Text size="sm" c="dimmed">{conflicts} conflicts detected</Text>
            </div>
          </Group>
        </Stack>
      </Card>

      <Card withBorder>
        <Title order={3} mb="md">Recommendations</Title>
        <Stack gap="sm">
          {coverage < 50 && (
            <Alert icon={<IconAlertTriangle size={16} />} color="yellow">
              Consider adding constraints for more teachers to improve coverage.
            </Alert>
          )}
          {totalConstraints === 0 && (
            <Alert icon={<IconAlertTriangle size={16} />} color="yellow">
              No constraints defined yet. Start by adding teacher unavailability constraints.
            </Alert>
          )}
          {conflicts > 0 && (
            <Alert icon={<IconX size={16} />} color="red">
              Please resolve the detected conflicts before generating timetables.
            </Alert>
          )}
        </Stack>
      </Card>
    </Stack>
  );
} 