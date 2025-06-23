"use client";

import React, { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Alert,
  Card,
  Group,
  Button,
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconCalendar, IconClock, IconSchool, IconPlus, IconEdit } from "@tabler/icons-react";
import Link from "next/link";
import SchoolEditModal from "./SchoolEditModal";
import type { Database } from "@/types/database";

type School = Database['public']['Tables']['schools']['Row'];
type AcademicYear = Database['public']['Tables']['academic_years']['Row'];
type Term = Database['public']['Tables']['terms']['Row'] & {
  academic_years: {
    id: string;
    name: string;
  } | null;
};

interface SchoolsClientWrapperProps {
  school: School;
  academicYears: AcademicYear[];
  terms: Term[];
  academicYearsError: any;
  termsError: any;
}

const SchoolsClientWrapper: React.FC<SchoolsClientWrapperProps> = ({
  school,
  academicYears,
  terms,
  academicYearsError,
  termsError,
}) => {
  const [currentSchool, setCurrentSchool] = useState<School>(school);
  const [editModalOpened, setEditModalOpened] = useState(false);

  const handleSchoolUpdate = (updatedSchool: School) => {
    setCurrentSchool(updatedSchool);
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={1}>School Configuration</Title>
          <Text c="dimmed" mt="xs">
            Manage your school's academic years, terms, and configuration settings.
          </Text>
        </div>

        {/* School Info Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3}>{currentSchool.name}</Title>
              <Text size="sm" c="dimmed">School Configuration</Text>
            </div>
            <Group>
              <Tooltip label="Edit School Information">
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => setEditModalOpened(true)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
              <Badge color="blue" variant="light">
                Active School
              </Badge>
            </Group>
          </Group>

          <Stack gap="md">
            <Group>
              <div>
                <Text size="sm" fw={500}>Start Time</Text>
                <Text size="sm" c="dimmed">
                  {currentSchool.start_time || 'Not set'}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500}>End Time</Text>
                <Text size="sm" c="dimmed">
                  {currentSchool.end_time || 'Not set'}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500}>Period Duration</Text>
                <Text size="sm" c="dimmed">
                  {currentSchool.period_duration ? `${currentSchool.period_duration} minutes` : 'Not set'}
                </Text>
              </div>
            </Group>

            <Group>
              <div>
                <Text size="sm" fw={500}>Sessions per Day</Text>
                <Text size="sm" c="dimmed">
                  {currentSchool.sessions_per_day || 'Not set'}
                </Text>
              </div>
            </Group>

            <div>
              <Text size="sm" fw={500}>Working Days</Text>
              <Text size="sm" c="dimmed">
                {currentSchool.working_days && currentSchool.working_days.length > 0 
                  ? currentSchool.working_days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')
                  : 'Not configured'
                }
              </Text>
            </div>
          </Stack>
        </Card>

        {/* Academic Years Section */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3}>Academic Years</Title>
              <Text size="sm" c="dimmed">Manage academic years and terms</Text>
            </div>
            <Button 
              leftSection={<IconPlus size={16} />}
              component={Link}
              href="/admin/academic-years"
            >
              Manage Academic Years
            </Button>
          </Group>

          {academicYearsError ? (
            <Alert color="red" title="Error">
              Failed to load academic years
            </Alert>
          ) : academicYears && academicYears.length > 0 ? (
            <Stack gap="sm">
              {academicYears.slice(0, 3).map((year) => (
                <Group key={year.id} justify="space-between" p="sm" style={{ border: '1px solid #eee', borderRadius: '8px' }}>
                  <div>
                    <Text fw={500}>{year.name}</Text>
                    <Text size="sm" c="dimmed">
                      {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                    </Text>
                  </div>
                  <Badge color="green" variant="light">
                    Active
                  </Badge>
                </Group>
              ))}
              {academicYears.length > 3 && (
                <Text size="sm" c="dimmed" ta="center">
                  +{academicYears.length - 3} more academic years
                </Text>
              )}
            </Stack>
          ) : (
            <Alert color="blue" title="No Academic Years">
              No academic years configured yet. Click "Manage Academic Years" to get started.
            </Alert>
          )}
        </Card>

        {/* Terms Section */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3}>Terms</Title>
              <Text size="sm" c="dimmed">View and manage terms within academic years</Text>
            </div>
            <Button 
              leftSection={<IconPlus size={16} />}
              component={Link}
              href="/admin/terms"
            >
              Manage Terms
            </Button>
          </Group>

          {termsError ? (
            <Alert color="red" title="Error">
              Failed to load terms
            </Alert>
          ) : terms && terms.length > 0 ? (
            <Stack gap="sm">
              {terms.slice(0, 5).map((term) => (
                <Group key={term.id} justify="space-between" p="sm" style={{ border: '1px solid #eee', borderRadius: '8px' }}>
                  <div>
                    <Text fw={500}>{term.name}</Text>
                    <Text size="sm" c="dimmed">
                      {term.academic_years?.name} • {new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()}
                    </Text>
                  </div>
                  <Badge color="blue" variant="light">
                    Term
                  </Badge>
                </Group>
              ))}
              {terms.length > 5 && (
                <Text size="sm" c="dimmed" ta="center">
                  +{terms.length - 5} more terms
                </Text>
              )}
            </Stack>
          ) : (
            <Alert color="blue" title="No Terms">
              No terms configured yet. Create academic years first, then add terms.
            </Alert>
          )}
        </Card>

        {/* Quick Actions */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Quick Actions</Title>
          <Group>
            <Button 
              variant="light" 
              leftSection={<IconCalendar size={16} />}
              component={Link}
              href="/admin/academic-calendar"
            >
              Academic Calendar
            </Button>
          </Group>
        </Card>
      </Stack>

      {/* Edit Modal */}
      <SchoolEditModal
        school={currentSchool}
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        onUpdate={handleSchoolUpdate}
      />
    </Container>
  );
};

export default SchoolsClientWrapper; 