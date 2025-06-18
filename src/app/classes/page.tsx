import { Suspense } from 'react'
import { ClassManagement } from '@/components/classes/class-management'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Loader } from '@mantine/core'

export const metadata = {
  title: 'Class Management - AI Timetable Generator',
  description: 'Configure grades, sections, and subject assignments',
}

export default function ClassesPage() {
  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Class Management</h1>
          <p className="text-gray-600 text-base max-w-2xl">
            Configure your school's grades, sections, and subject assignments. Add, edit, and manage all class sections in one place.
          </p>
        </div>
        <div className="flex gap-2">
          {/* You can add a quick action button here if needed */}
        </div>
      </div>
      <Suspense fallback={<Loader />}>
        <ClassManagement />
      </Suspense>
    </DashboardShell>
  )
}