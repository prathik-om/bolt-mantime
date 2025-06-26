"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tabs,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Grid,
  Button,
  Alert,
  Progress,
  RingProgress,
  Paper,
  Divider,
  Box,
  ThemeIcon,
  List,
  ListItem,
  Accordion,
  AccordionItem,
  AccordionControl,
  AccordionPanel,
  AccordionChevron,
} from '@mantine/core';
import {
  IconBrain,
  IconClock,
  IconUsers,
  IconSettings,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconUser,
  IconCalendar,
  IconGauge,
  IconChartBar,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconTemplate,
  IconSchool,
  IconBuilding,
  IconInfoCircle,
} from '@tabler/icons-react';
import TeacherConstraintsTab from './TeacherConstraintsTab';
import SchoolWideConstraintsTab from './SchoolWideConstraintsTab';
import ConstraintTemplatesTab from './ConstraintTemplatesTab';
import ConstraintValidationTab from './ConstraintValidationTab';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  max_periods_per_week: number | null;
}

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  period_number: number | null;
  is_teaching_period: boolean | null;
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

interface ConstraintStats {
  totalConstraints: number;
  teacherConstraints: number;
  schoolWideConstraints: number;
  templates: number;
  conflicts: number;
  coverage: number;
}

interface Props {
  schoolId: string;
  schoolName: string;
  initialData: {
    teachers: Teacher[];
    timeSlots: TimeSlot[];
    teacherConstraints: TeacherConstraint[];
    schoolConfig: SchoolConfig;
  };
}

export default function ConstraintManagementClientUI({ schoolId, schoolName, initialData }: Props) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Filter to only show unavailable constraints (hard constraints supported by solver)
  const availableConstraints = useMemo(() => 
    initialData.teacherConstraints.filter(c => c.constraint_type === 'unavailable'),
    [initialData.teacherConstraints]
  );

  // Calculate constraint statistics
  const constraintStats = useMemo(() => {
    const teacherConstraints = availableConstraints.length;
    const schoolWideConstraints = 0; // Will be calculated from school-wide constraints
    const templates = 0; // Will be calculated from templates
    const conflicts = 0; // Will be calculated from validation
    const totalConstraints = teacherConstraints + schoolWideConstraints;
    
    // Calculate coverage percentage (teachers with constraints / total teachers)
    const teachersWithConstraints = new Set(availableConstraints.map(c => c.teacher_id)).size;
    const coverage = initialData.teachers.length > 0 
      ? Math.round((teachersWithConstraints / initialData.teachers.length) * 100)
      : 0;

    return {
      totalConstraints,
      teacherConstraints,
      schoolWideConstraints,
      templates,
      conflicts,
      coverage,
    };
  }, [availableConstraints, initialData.teachers.length]);

  const handleTabChange = useCallback((value: string | null) => {
    setActiveTab(value || 'overview');
  }, []);

  const handleQuickAction = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <Tabs value={activeTab} onChange={handleTabChange}>
      <Tabs.List>
        <Tabs.Tab value="overview" leftSection={<IconGauge size={16} />}>
          Overview
        </Tabs.Tab>
        <Tabs.Tab value="teacher-constraints" leftSection={<IconUsers size={16} />}>
          Teacher Unavailability
        </Tabs.Tab>
        <Tabs.Tab value="school-wide" leftSection={<IconSchool size={16} />}>
          School-Wide Rules
        </Tabs.Tab>
        <Tabs.Tab value="validation" leftSection={<IconCheck size={16} />}>
          Validation
        </Tabs.Tab>
      </Tabs.List>

      {/* Overview Tab */}
      <Tabs.Panel value="overview" pt="md">
        <Grid>
          <Grid.Col span={8}>
            <Stack gap="md">
              {/* Info Alert */}
              <Alert icon={<IconInfoCircle size={16} />} color="blue">
                <Text size="sm">
                  <strong>Phase 1:</strong> Currently supporting hard constraints (teacher unavailability) and school-wide rules. 
                  Soft preferences, priorities, and room constraints will be added in the next phase.
                </Text>
              </Alert>

              {/* Quick Stats */}
              <Card withBorder>
                <Title order={3} mb="md">Constraint Overview</Title>
                <Grid>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <RingProgress
                        size={80}
                        thickness={8}
                        sections={[{ value: constraintStats.coverage, color: 'blue' }]}
                        label={
                          <Text ta="center" size="xs" fw={700}>
                            {constraintStats.coverage}%
                          </Text>
                        }
                      />
                      <Text size="sm" ta="center" fw={500}>Coverage</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <ThemeIcon size={80} variant="light" color="red">
                        <IconX size={40} />
                      </ThemeIcon>
                      <Text size="lg" fw={700}>{constraintStats.teacherConstraints}</Text>
                      <Text size="sm" ta="center" c="dimmed">Unavailable Slots</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <ThemeIcon size={80} variant="light" color="green">
                        <IconSchool size={40} />
                      </ThemeIcon>
                      <Text size="lg" fw={700}>{constraintStats.schoolWideConstraints}</Text>
                      <Text size="sm" ta="center" c="dimmed">School Rules</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <ThemeIcon size={80} variant="light" color="orange">
                        <IconTemplate size={40} />
                      </ThemeIcon>
                      <Text size="lg" fw={700}>{constraintStats.templates}</Text>
                      <Text size="sm" ta="center" c="dimmed">Templates</Text>
                    </Stack>
                  </Grid.Col>
                </Grid>
              </Card>

              {/* Recent Constraints */}
              <Card withBorder>
                <Title order={3} mb="md">Recent Teacher Unavailability</Title>
                {availableConstraints.length > 0 ? (
                  <Stack gap="sm">
                    {availableConstraints.slice(0, 5).map((constraint) => (
                      <Paper key={constraint.id} p="sm" withBorder>
                        <Group justify="space-between">
                          <Group gap="sm">
                            <ThemeIcon size="sm" color="red">
                              <IconX size={16} />
                            </ThemeIcon>
                            <div>
                              <Text size="sm" fw={500}>
                                {constraint.teachers.first_name} {constraint.teachers.last_name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {constraint.time_slots.day_of_week} {constraint.time_slots.start_time}-{constraint.time_slots.end_time}
                              </Text>
                            </div>
                          </Group>
                          <Badge color="red" variant="light">
                            unavailable
                          </Badge>
                        </Group>
                        {constraint.reason && (
                          <Text size="xs" c="dimmed" mt="xs">
                            {constraint.reason}
                          </Text>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Alert icon={<IconAlertTriangle size={16} />} color="blue">
                    No teacher unavailability constraints defined yet. Add constraints to improve timetable generation.
                  </Alert>
                )}
              </Card>
            </Stack>
          </Grid.Col>

          <Grid.Col span={4}>
            <Stack gap="md">
              {/* Quick Actions */}
              <Card withBorder>
                <Title order={3} mb="md">Quick Actions</Title>
                <Stack gap="sm">
                  <Button 
                    variant="light" 
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleQuickAction('teacher-constraints')}
                  >
                    Add Teacher Unavailability
                  </Button>
                  <Button 
                    variant="light" 
                    leftSection={<IconSettings size={16} />}
                    onClick={() => handleQuickAction('school-wide')}
                  >
                    Configure School Rules
                  </Button>
                  <Button 
                    variant="light" 
                    leftSection={<IconCheck size={16} />}
                    onClick={() => handleQuickAction('validation')}
                  >
                    Run Validation
                  </Button>
                </Stack>
              </Card>

              {/* Coverage Progress */}
              <Card withBorder>
                <Title order={3} mb="md">Coverage Status</Title>
                <Stack gap="sm">
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm">Teacher Coverage</Text>
                      <Text size="sm" fw={500}>{constraintStats.coverage}%</Text>
                    </Group>
                    <Progress 
                      value={constraintStats.coverage} 
                      color={constraintStats.coverage > 50 ? 'green' : constraintStats.coverage > 25 ? 'yellow' : 'red'}
                      size="sm"
                    />
                  </div>
                  <Text size="xs" c="dimmed">
                    {constraintStats.teacherConstraints} of {initialData.teachers.length} teachers have unavailability constraints
                  </Text>
                </Stack>
              </Card>

              {/* System Status */}
              <Card withBorder>
                <Title order={3} mb="md">System Status</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm">Hard Constraints</Text>
                    <Badge color="green" variant="light">Supported</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Soft Preferences</Text>
                    <Badge color="yellow" variant="light">Coming Soon</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Room Constraints</Text>
                    <Badge color="yellow" variant="light">Coming Soon</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Priority Weights</Text>
                    <Badge color="yellow" variant="light">Coming Soon</Badge>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Tabs.Panel>

      {/* Teacher Constraints Tab */}
      <Tabs.Panel value="teacher-constraints" pt="md">
        <TeacherConstraintsTab
          schoolId={schoolId}
          teachers={initialData.teachers}
          timeSlots={initialData.timeSlots}
          teacherConstraints={availableConstraints}
        />
      </Tabs.Panel>

      {/* School-Wide Rules Tab */}
      <Tabs.Panel value="school-wide" pt="md">
        <SchoolWideConstraintsTab
          schoolId={schoolId}
          schoolConfig={initialData.schoolConfig}
        />
      </Tabs.Panel>

      {/* Validation Tab */}
      <Tabs.Panel value="validation" pt="md">
        <ConstraintValidationTab
          schoolId={schoolId}
          teachers={initialData.teachers}
          teacherConstraints={availableConstraints}
          schoolConfig={initialData.schoolConfig}
        />
      </Tabs.Panel>
    </Tabs>
  );
} 