import { Suspense } from 'react'
import { TeacherManagement } from '@/components/teachers/teacher-management'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Loader } from '@mantine/core'

export const metadata = {
  title: 'Teacher Management - AI Timetable Generator',
  description: 'Manage teaching staff and their subject assignments',
}

export default function TeachersPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<Loader />}>
        <TeacherManagement />
      </Suspense>
    </DashboardShell>
  )
}