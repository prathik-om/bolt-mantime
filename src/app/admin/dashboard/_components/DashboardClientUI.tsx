'use client';

import { SimpleGrid, Group, ThemeIcon, List, Stack, Paper, Grid, Text, Title } from '@mantine/core';
import { IconUsers, IconBook, IconSchool, IconCalendarEvent, IconCheck, IconArrowRight } from '@tabler/icons-react';

interface DashboardData {
  teachers: number;
  subjects: number;
  classes: number;
  timetableEntries: number;
}

interface DashboardClientUIProps {
  initialData: DashboardData;
  schoolId: string;
}

const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) => (
  <Paper withBorder p="md" radius="md">
    <Group justify="space-between">
      <div>
        <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
          {title}
        </Text>
        <Text fw={700} fz="xl">
          {value}
        </Text>
      </div>
      <ThemeIcon color={color} variant="light" size={38} radius="md">
        {icon}
      </ThemeIcon>
    </Group>
  </Paper>
);

const gettingStartedSteps = [
  'Set up teachers and their subjects',
  'Configure subjects and requirements',
  'Define classes and sections',
  'Generate optimized timetables',
];

export default function DashboardClientUI({ initialData, schoolId }: DashboardClientUIProps) {
  const dataConfigurationReady = initialData.teachers > 0 && initialData.subjects > 0 && initialData.classes > 0;
  const lastUpdated = new Date().toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'});

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>School Timetable Dashboard</Title>
          <Text c="dimmed">Intelligent scheduling for K-12 education</Text>
        </div>
        <Text size="sm" c="dimmed">Last updated: {lastUpdated}</Text>
      </Group>

      {/* Stat Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard title="Teachers" value={initialData.teachers} icon={<IconUsers size={22} />} color="blue" />
        <StatCard title="Subjects" value={initialData.subjects} icon={<IconBook size={22} />} color="green" />
        <StatCard title="Classes" value={initialData.classes} icon={<IconSchool size={22} />} color="violet" />
        <StatCard title="Timetable Entries" value={initialData.timetableEntries} icon={<IconCalendarEvent size={22} />} color="orange" />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md" h="100%">
            <Title order={4} mb="md">System Status</Title>
            <Stack>
              <Group>
                <ThemeIcon color={dataConfigurationReady ? 'teal' : 'gray'} size={24} radius="xl">
                  <IconCheck size={16} />
                </ThemeIcon>
                <Text fw={500}>Data Configuration</Text>
                <Text ml="auto" c={dataConfigurationReady ? 'teal' : 'gray'} size="sm">
                  {dataConfigurationReady ? 'Ready' : 'Incomplete'}
                </Text>
              </Group>
              <Group>
                <ThemeIcon color="yellow" size={24} radius="xl">
                  <IconArrowRight size={16} />
                </ThemeIcon>
                <Text fw={500}>Timetable Generation</Text>
                <Text ml="auto" c="yellow" size="sm">Pending</Text>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md" h="100%">
            <Title order={4} mb="md">Getting Started</Title>
            <List
              spacing="xs"
              size="sm"
              center
              icon={
                <ThemeIcon color="teal" size={24} radius="xl">
                  <IconCheck size={16} />
                </ThemeIcon>
              }
            >
              {gettingStartedSteps.map(step => <List.Item key={step}>{step}</List.Item>)}
            </List>
          </Paper>
        </Grid.Col>
      </Grid>
      
      <Paper withBorder p="md" radius="md">
        <Title order={4}>Quick Actions</Title>
        <Text c="dimmed" size="sm">Further actions can be added here.</Text>
      </Paper>
    </Stack>
  );
} 