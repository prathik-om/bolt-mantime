'use client'

import Link from 'next/link'
import { TrendingUp, Users, GraduationCap, Zap } from 'lucide-react'

export function QuickActions() {
  const actions = [
    {
      title: 'Generate New Timetable',
      description: 'Use AI to create optimized schedules',
      icon: Zap,
      color: 'bg-gradient-to-r from-blue-600 to-indigo-600',
      href: '/generator'
    },
    {
      title: 'Manage Teachers',
      description: 'Add, edit, or remove teaching staff',
      icon: Users,
      color: 'bg-gradient-to-r from-emerald-600 to-teal-600',
      href: '/teachers'
    },
    {
      title: 'Configure Classes',
      description: 'Set up grades, sections, and subjects',
      icon: GraduationCap,
      color: 'bg-gradient-to-r from-purple-600 to-pink-600',
      href: '/classes'
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.title}
              href={action.href as any}
              className="group cursor-pointer rounded-xl p-6 text-white transition-all duration-200 hover:scale-105 hover:shadow-xl"
              style={{ background: action.color }}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className="w-8 h-8 opacity-90" />
                <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <h4 className="text-lg font-semibold mb-2">{action.title}</h4>
              <p className="text-sm opacity-90">{action.description}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}