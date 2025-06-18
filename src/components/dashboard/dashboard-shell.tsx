'use client'

import { Navigation } from '@/components/navigation/navigation'
import { Card } from '@mantine/core'
import { useState } from 'react'
import { useSchoolContext } from '@/hooks/use-school-context'
import { SchoolCreateModal } from './school-create-modal'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { schoolId, setSchoolId, schoolsLoading } = useSchoolContext()
  const [showModal, setShowModal] = useState(false)

  // Show modal if not loading and no schoolId
  const shouldPrompt = !schoolsLoading && !schoolId

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="lg:ml-64 min-h-screen">
        <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-7xl mx-auto">
          {shouldPrompt && (
            <SchoolCreateModal
              open={true}
              onClose={() => {}}
              onCreated={id => setSchoolId(id)}
            />
          )}
          {children}
        </Card>
      </main>
    </div>
  )
}