import { Suspense } from 'react'
import { TimetableView } from '@/components/timetables/timetable-view'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Loader } from '@mantine/core'

export const metadata = {
  title: 'Timetables - AI Timetable Generator',
  description: 'View and manage generated timetables',
}

export default function TimetablesPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<Loader />}>
        <TimetableView />
      </Suspense>
    </DashboardShell>
  )
}