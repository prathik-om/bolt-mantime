import { Suspense } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { SystemStatus } from '@/components/dashboard/system-status'
import { Loader } from '@mantine/core'

export default function HomePage() {
  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-sm p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">AI Timetable Generator</h1>
              <p className="text-blue-100 text-lg">Intelligent scheduling for K-12 education</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Suspense fallback={<Loader />}>
              <DashboardStats />
            </Suspense>
            
            <Suspense fallback={<Loader />}>
              <QuickActions />
            </Suspense>
          </div>
          
          <div className="space-y-8">
            <Suspense fallback={<Loader />}>
              <SystemStatus />
            </Suspense>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}