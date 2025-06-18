import { Suspense } from 'react'
import { RoomManagement } from '@/components/rooms/room-management'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Loader } from '@mantine/core'

export const metadata = {
  title: 'Room Management - AI Timetable Generator',
  description: 'Configure classrooms and facilities',
}

export default function RoomsPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<Loader />}>
        <RoomManagement />
      </Suspense>
    </DashboardShell>
  )
}