import { Suspense } from 'react'
import { TimetableGenerator } from '@/components/generator/timetable-generator'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Loader } from '@mantine/core'

export const metadata = {
  title: 'AI Generator - AI Timetable Generator',
  description: 'Generate optimized timetables using AI algorithms',
}

export default function GeneratorPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<Loader />}>
        <TimetableGenerator />
      </Suspense>
    </DashboardShell>
  )
}