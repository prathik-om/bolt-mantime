'use client'

import { useSchoolStats } from '@/hooks/use-school-stats'
import { Users, BookOpen, GraduationCap, Calendar } from 'lucide-react'
import { Card, Text, Group, SimpleGrid, Skeleton } from '@mantine/core'
import Link from 'next/link'

interface StatCardProps {
  title: string
  value: string
  icon: React.ElementType
  color: string
  href: string
}

function StatCard({ title, value, icon: Icon, color, href }: StatCardProps) {
  return (
    <Link href={href as any} style={{ textDecoration: 'none' }}>
      <Card padding="lg" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500} c="dimmed">
            {title}
          </Text>
          <Icon style={{ 
            width: '1.5rem', 
            height: '1.5rem', 
            color: `var(--mantine-color-${color}-6)` 
          }} />
        </Group>
        <Text size="xl" fw={700}>
          {value}
        </Text>
      </Card>
    </Link>
  )
}

export function DashboardStats() {
  const { data: stats, isLoading } = useSchoolStats()

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="md">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={120} radius="md" />
        ))}
      </SimpleGrid>
    )
  }

  const statsData: StatCardProps[] = [
    {
      title: 'Teachers',
      value: String(stats?.teachers ?? '0'),
      icon: Users,
      color: 'blue',
      href: '/teachers'
    },
    {
      title: 'Subjects',
      value: String(stats?.subjects ?? '0'),
      icon: BookOpen,
      color: 'emerald',
      href: '/subjects'
    },
    {
      title: 'Classes',
      value: String(stats?.classSections ?? '0'),
      icon: GraduationCap,
      color: 'purple',
      href: '/classes'
    },
    {
      title: 'Timetables',
      value: String(stats?.timetables ?? '0'),
      icon: Calendar,
      color: 'orange',
      href: '/timetables'
    }
  ]

  return (
    <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="md">
      {statsData.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </SimpleGrid>
  )
}