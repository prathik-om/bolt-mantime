'use client';

import { NavLink, Stack, Title, Text, Group, Divider } from '@mantine/core';
import {
  IconGauge,
  IconUsers,
  IconBook2,
  IconSchool,
  IconSparkles,
  IconCalendarTime,
  IconLayoutDashboard,
  IconBuilding,
  IconBook,
  IconCalendar,
  IconClock,
  IconBrain,
  IconLink,
  IconTable,
  IconCertificate,
  IconUsersGroup,
} from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const links = [
  { icon: IconLayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: IconBuilding, label: 'Schools', href: '/admin/schools' },
  { icon: IconUsers, label: 'Teachers', href: '/admin/teachers' },
  { icon: IconCertificate, label: 'Teacher Qualifications', href: '/admin/teacher-qualifications' },
  { icon: IconUsersGroup, label: 'Classes', href: '/admin/classes' },
  { icon: IconBook, label: 'Subjects', href: '/admin/subjects' },
  { icon: IconLink, label: 'Grade-Subject Mappings', href: '/admin/grade-subjects' },
  { icon: IconCalendarTime, label: 'Academic Calendar', href: '/admin/academic-calendar' },
  { icon: IconClock, label: 'Time Slots', href: '/admin/time-slots' },
  { icon: IconTable, label: 'Timetables', href: '/admin/timetables' },
];

export default function AdminNavbar() {
  const pathname = usePathname();

  const items = links.map((link) => (
    <NavLink
      key={link.label}
      label={link.label}
      leftSection={<link.icon size="1rem" stroke={1.5} />}
      active={pathname === link.href}
      component={Link}
      href={link.href as any}
      variant="filled"
    />
  ));

  return (
    <Stack justify="space-between" style={{ height: '100%' }}>
      <div>
        <Group p="md">
            <IconGauge size={28} />
            <div>
                <Title order={4}>TimetableAI</Title>
                <Text size="xs" c="dimmed">K-12 Scheduler</Text>
            </div>
        </Group>

        <Divider my="sm" />
        {items}
      </div>
      <Text size="xs" c="dimmed" p="md">
        Powered by AI - Version 1.0
      </Text>
    </Stack>
  );
} 