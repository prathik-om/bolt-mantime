'use client';

import { Card, Title, Text, Stack, Group, Badge, ThemeIcon, Button, Alert } from '@mantine/core';
import { 
  IconSchool, 
  IconCalendar, 
  IconUsers, 
  IconBook, 
  IconBuilding, 
  IconClock,
  IconWand,
  IconCheck,
  IconArrowRight
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  completed: boolean;
  required: boolean;
}

interface SetupStatus {
  schools?: boolean;
  academicYears?: boolean;
  terms?: boolean;
  teachers?: boolean;
  subjects?: boolean;
  classes?: boolean;
  rooms?: boolean;
  timeSlots?: boolean;
}

interface SetupGuideProps {
  schoolId?: string;
  showCompleted?: boolean;
  compact?: boolean;
  setupStatus?: SetupStatus;
}

export function SetupGuide({ 
  schoolId, 
  showCompleted = true, 
  compact = false, 
  setupStatus = {} 
}: SetupGuideProps) {
  const router = useRouter();

  const setupSteps: SetupStep[] = [
    {
      id: 'schools',
      title: 'School Setup',
      description: 'Basic school information and configuration',
      icon: <IconSchool size={20} />,
      route: '/admin/schools',
      completed: setupStatus.schools || false,
      required: true
    },
    {
      id: 'academic-years',
      title: 'Academic Calendar',
      description: 'Set up academic years and terms',
      icon: <IconCalendar size={20} />,
      route: '/admin/academic-calendar',
      completed: setupStatus.academicYears || false,
      required: true
    },
    {
      id: 'teachers',
      title: 'Teachers',
      description: 'Add teaching staff and qualifications',
      icon: <IconUsers size={20} />,
      route: '/admin/teachers',
      completed: setupStatus.teachers || false,
      required: true
    },
    {
      id: 'subjects',
      title: 'Subjects',
      description: 'Define curriculum subjects',
      icon: <IconBook size={20} />,
      route: '/admin/subjects',
      completed: setupStatus.subjects || false,
      required: true
    },
    {
      id: 'classes',
      title: 'Classes',
      description: 'Configure grade levels and sections',
      icon: <IconSchool size={20} />,
      route: '/admin/classes',
      completed: setupStatus.classes || false,
      required: true
    },
    {
      id: 'time-slots',
      title: 'Time Slots',
      description: 'Define teaching periods and schedules',
      icon: <IconClock size={20} />,
      route: '/admin/time-slots',
      completed: setupStatus.timeSlots || false,
      required: true
    },
    {
      id: 'rooms',
      title: 'Rooms',
      description: 'Set up classrooms and facilities',
      icon: <IconBuilding size={20} />,
      route: '/admin/rooms',
      completed: setupStatus.rooms || false,
      required: false
    },
    {
      id: 'timetable',
      title: 'Generate Timetable',
      description: 'Create optimal class schedules',
      icon: <IconWand size={20} />,
      route: '/admin/generator',
      completed: false, // This is always false as it's the final step
      required: false
    }
  ];

  const handleStepClick = (step: SetupStep) => {
    if (schoolId) {
      router.push(`${step.route}?school=${schoolId}` as any);
    } else {
      router.push(step.route as any);
    }
  };

  const filteredSteps = showCompleted 
    ? setupSteps 
    : setupSteps.filter(step => !step.completed);

  const completedCount = setupSteps.filter(step => step.completed).length;
  const requiredCompletedCount = setupSteps.filter(step => step.completed && step.required).length;
  const requiredCount = setupSteps.filter(step => step.required).length;

  if (compact) {
    return (
      <Card withBorder p="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Setup Progress</Title>
          <Badge variant="light" color="blue">
            {requiredCompletedCount}/{requiredCount} Required
          </Badge>
        </Group>
        <Stack gap="xs">
          {filteredSteps.slice(0, 3).map((step) => (
            <Group key={step.id} justify="space-between">
              <Group gap="xs">
                <ThemeIcon 
                  size="sm" 
                  variant="light" 
                  color={step.completed ? 'green' : 'gray'}
                >
                  {step.completed ? <IconCheck size={12} /> : step.icon}
                </ThemeIcon>
                <Text size="sm" fw={500}>{step.title}</Text>
                {step.required && <Badge size="xs" variant="dot">Required</Badge>}
              </Group>
              <Button 
                variant="light" 
                size="xs"
                onClick={() => handleStepClick(step)}
              >
                {step.completed ? 'View' : 'Setup'}
              </Button>
            </Group>
          ))}
          {filteredSteps.length > 3 && (
            <Button 
              variant="light" 
              size="xs" 
              fullWidth
              onClick={() => router.push('/admin/dashboard')}
            >
              View All Steps
            </Button>
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={3}>Setup Guide</Title>
          <Text c="dimmed" size="sm">
            Complete these steps to get your school management system fully configured
          </Text>
        </div>
        <Badge variant="light" color="blue" size="lg">
          {requiredCompletedCount}/{requiredCount} Required Complete
        </Badge>
      </Group>

      <Stack gap="md">
        {filteredSteps.map((step, index) => (
          <Card 
            key={step.id} 
            withBorder 
            p="md" 
            style={{ 
              opacity: step.completed ? 0.7 : 1,
              borderColor: step.completed ? 'var(--mantine-color-green-3)' : undefined
            }}
          >
            <Group justify="space-between" align="flex-start">
              <Group gap="md" align="flex-start">
                <ThemeIcon 
                  size="lg" 
                  variant="light" 
                  color={step.completed ? 'green' : 'blue'}
                >
                  {step.completed ? <IconCheck size={20} /> : step.icon}
                </ThemeIcon>
                <div>
                  <Group gap="xs" align="center">
                    <Title order={5}>{step.title}</Title>
                    {step.required && <Badge size="xs" variant="dot" color="red">Required</Badge>}
                    {step.completed && <Badge size="xs" variant="light" color="green">Complete</Badge>}
                  </Group>
                  <Text c="dimmed" size="sm" mt={4}>
                    {step.description}
                  </Text>
                </div>
              </Group>
              <Button 
                variant={step.completed ? "light" : "filled"}
                size="sm"
                onClick={() => handleStepClick(step)}
                rightSection={step.completed ? undefined : <IconArrowRight size={14} />}
              >
                {step.completed ? 'View' : 'Setup'}
              </Button>
            </Group>
          </Card>
        ))}
      </Stack>

      {completedCount === setupSteps.length && (
        <Alert color="green" title="🎉 Setup Complete!" mt="lg">
          <Text size="sm">
            All setup steps have been completed. Your school management system is ready to use!
          </Text>
        </Alert>
      )}
    </Card>
  );
} 