"use client";

import React, { useState, useEffect } from "react";
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
import { IconCalendar, IconClock, IconSchool, IconPlus, IconEdit, IconCoffee, IconCalendarEvent } from "@tabler/icons-react";
import Link from "next/link";
import SchoolEditModal from "./SchoolEditModal";
import DailyScheduleModal from "./DailyScheduleModal";
import HolidaysManagementModal from "./HolidaysManagementModal";
import AcademicYearsManagementModal from "./AcademicYearsManagementModal";
import TermsManagementModal from "./TermsManagementModal";
import type { Database } from "@/lib/database.types";
import { getBreaks } from "@/lib/api/breaks";
import { getHolidaysByAcademicYearId } from "@/lib/api/holidays";

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
  const [dailyScheduleModalOpened, setDailyScheduleModalOpened] = useState(false);
  const [holidaysModalOpened, setHolidaysModalOpened] = useState(false);
  const [academicYearsModalOpened, setAcademicYearsModalOpened] = useState(false);
  const [termsModalOpened, setTermsModalOpened] = useState(false);
  const [breaksPreview, setBreaksPreview] = useState<any[]>([]);
  const [holidaysPreview, setHolidaysPreview] = useState<any[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  const handleSchoolUpdate = (updatedSchool: School) => {
    setCurrentSchool(updatedSchool);
  };

  // Fetch breaks for daily schedule preview
  useEffect(() => {
    async function fetchBreaks() {
      try {
        const data = await getBreaks(currentSchool.id);
        setBreaksPreview(data);
      } catch {
        setBreaksPreview([]);
      }
    }
    fetchBreaks();
  }, [currentSchool.id]);

  // Fetch holidays for the first academic year for preview
  useEffect(() => {
    async function fetchHolidays() {
      if (!academicYears || academicYears.length === 0) return;
      setHolidaysLoading(true);
      try {
        const data = await getHolidaysByAcademicYearId(currentSchool.id, academicYears[0].id);
        setHolidaysPreview(data);
      } catch {
        setHolidaysPreview([]);
      } finally {
        setHolidaysLoading(false);
      }
    }
    fetchHolidays();
  }, [currentSchool.id, academicYears]);

  // Helper to generate periods and breaks preview
  function generateSchedulePreview() {
    const periods = [];
    const breaks = breaksPreview || [];
    const sessionsPerDay = currentSchool.sessions_per_day || 8;
    const periodDuration = currentSchool.period_duration || 45;
    let currentTime = currentSchool.start_time || "08:00";
    function addMinutes(time: string, mins: number) {
      const [h, m] = time.split(":").map(Number);
      const date = new Date(2000, 0, 1, h, m);
      date.setMinutes(date.getMinutes() + mins);
      return date.toTimeString().slice(0, 5);
    }
    let schedule = [];
    let breakIdx = 0;
    for (let i = 0; i < sessionsPerDay; i++) {
      const periodStart = currentTime;
      const periodEnd = addMinutes(periodStart, periodDuration);
      schedule.push({
        type: "period",
        name: `Period ${i + 1}`,
        start: periodStart,
        end: periodEnd,
      });
      currentTime = periodEnd;
      // Insert break if it matches the next slot
      if (breakIdx < breaks.length) {
        const br = breaks[breakIdx];
        if (br.start_time === currentTime) {
          schedule.push({
            type: "break",
            name: br.name,
            start: br.start_time,
            end: br.end_time,
          });
          currentTime = br.end_time;
          breakIdx++;
        }
      }
    }
    return schedule;
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={1}>School Configuration</Title>
          <Text c="dimmed" mt="xs">
            Manage your school's academic years, terms, daily schedule, holidays, and configuration settings.
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
              <Text size="sm" c="dimmed">Manage academic years and their date ranges</Text>
            </div>
            <Button 
              leftSection={<IconPlus size={16} />}
              onClick={() => setAcademicYearsModalOpened(true)}
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
                      {new Date(year.start_date).toISOString().split('T')[0]} - {new Date(year.end_date).toISOString().split('T')[0]}
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
              <Text size="sm" c="dimmed">Manage terms within academic years</Text>
            </div>
            <Button 
              leftSection={<IconPlus size={16} />}
              onClick={() => setTermsModalOpened(true)}
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
                      {term.academic_years?.name} • {new Date(term.start_date).toISOString().split('T')[0]} - {new Date(term.end_date).toISOString().split('T')[0]}
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

        {/* Daily Schedule Preview Section */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3}>Daily Schedule</Title>
              <Text size="sm" c="dimmed">Preview of today's periods and breaks</Text>
            </div>
            <Button 
              leftSection={<IconClock size={16} />}
              onClick={() => setDailyScheduleModalOpened(true)}
            >
              Manage Daily Schedule
            </Button>
          </Group>
          <Stack gap="sm">
            {generateSchedulePreview().slice(0, 3).map((item, idx) => (
              <Group key={idx} justify="space-between" p="sm" style={{ border: '1px solid #eee', borderRadius: '8px' }}>
                <div>
                  <Text fw={500}>{item.name}</Text>
                  <Text size="sm" c="dimmed">{item.start} - {item.end}</Text>
                </div>
                <Badge color={item.type === 'period' ? 'blue' : 'orange'} variant="light">
                  {item.type === 'period' ? 'Period' : 'Break'}
                </Badge>
              </Group>
            ))}
            {generateSchedulePreview().length > 3 && (
              <Text size="sm" c="blue" ta="center" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setDailyScheduleModalOpened(true)}>
                +{generateSchedulePreview().length - 3} more periods/breaks
              </Text>
            )}
            {generateSchedulePreview().length === 0 && (
              <Alert color="blue" title="No Schedule">
                No daily schedule configured yet.
              </Alert>
            )}
          </Stack>
        </Card>

        {/* Holidays Preview Section */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3}>Holidays</Title>
              <Text size="sm" c="dimmed">Preview of holidays for the current academic year</Text>
            </div>
            <Button 
              leftSection={<IconCalendarEvent size={16} />}
              onClick={() => setHolidaysModalOpened(true)}
            >
              Manage Holidays
            </Button>
          </Group>
          <Stack gap="sm">
            {holidaysLoading ? (
              <Text size="sm" c="dimmed">Loading holidays...</Text>
            ) : holidaysPreview.slice(0, 3).map((holiday, idx) => (
              <Group key={holiday.id || idx} justify="space-between" p="sm" style={{ border: '1px solid #eee', borderRadius: '8px' }}>
                <div>
                  <Text fw={500}>{holiday.name}</Text>
                  <Text size="sm" c="dimmed">{holiday.date}</Text>
                  {holiday.reason && (
                    <Text size="xs" c="dimmed">{holiday.reason}</Text>
                  )}
                </div>
                <Badge color="red" variant="light">Holiday</Badge>
              </Group>
            ))}
            {holidaysPreview.length > 3 && (
              <Text size="sm" c="dimmed" ta="center">
                +{holidaysPreview.length - 3} more holidays
              </Text>
            )}
            {holidaysPreview.length === 0 && !holidaysLoading && (
              <Alert color="blue" title="No Holidays">
                No holidays configured yet for this academic year.
              </Alert>
            )}
          </Stack>
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

      {/* Modals */}
      <SchoolEditModal
        school={currentSchool}
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        onUpdate={handleSchoolUpdate}
      />

      <DailyScheduleModal
        opened={dailyScheduleModalOpened}
        onClose={() => setDailyScheduleModalOpened(false)}
        schoolId={currentSchool.id}
        currentSchool={{
          sessions_per_day: currentSchool.sessions_per_day || 8,
          start_time: currentSchool.start_time || "08:00",
          end_time: currentSchool.end_time || "15:30",
          period_duration: currentSchool.period_duration || 50,
        }}
        onSchoolUpdate={handleSchoolUpdate}
      />

      <HolidaysManagementModal
        opened={holidaysModalOpened}
        onClose={() => setHolidaysModalOpened(false)}
        schoolId={currentSchool.id}
      />

      <AcademicYearsManagementModal
        opened={academicYearsModalOpened}
        onClose={() => setAcademicYearsModalOpened(false)}
        schoolId={currentSchool.id}
      />

      <TermsManagementModal
        opened={termsModalOpened}
        onClose={() => setTermsModalOpened(false)}
        schoolId={currentSchool.id}
      />
    </Container>
  );
};

export default SchoolsClientWrapper; 