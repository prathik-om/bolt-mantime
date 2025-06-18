import { Suspense } from 'react'
import { SubjectManagement } from '@/components/subjects/subject-management'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Loader } from '@mantine/core'

export const metadata = {
  title: 'Subject Management - AI Timetable Generator',
  description: 'Configure subjects and their requirements',
}

export default function SubjectsPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<Loader />}>
        <SubjectManagement />
      </Suspense>
    </DashboardShell>
  )
}