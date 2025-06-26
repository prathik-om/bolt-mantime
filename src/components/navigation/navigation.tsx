'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Building,
  Zap, 
  Calendar,
  Menu,
  X,
  IconDashboard,
  IconSchool,
  IconBuildingCommunity,
  IconUsers,
  IconCertificate,
  IconUsersGroup,
  IconBook,
  IconLink,
  IconCalendar,
  IconClock,
  IconClipboardList,
  IconTable
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'teachers', label: 'Teachers', icon: Users, href: '/teachers' },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, href: '/subjects' },
  { id: 'classes', label: 'Classes', icon: GraduationCap, href: '/classes' },
  { id: 'rooms', label: 'Rooms', icon: Building, href: '/rooms' },
  { id: 'generator', label: 'AI Generator', icon: Zap, href: '/generator' },
  { id: 'timetables', label: 'Timetables', icon: Calendar, href: '/admin/timetables' },
]

const adminLinks = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: IconDashboard
  },
  {
    label: 'Schools',
    href: '/admin/schools',
    icon: IconSchool
  },
  {
    label: 'Departments',
    href: '/admin/departments',
    icon: IconBuildingCommunity
  },
  {
    label: 'Teachers',
    href: '/admin/teachers',
    icon: IconUsers
  },
  {
    label: 'Teacher Qualifications',
    href: '/admin/teacher-qualifications',
    icon: IconCertificate
  },
  {
    label: 'Classes',
    href: '/admin/classes',
    icon: IconUsersGroup
  },
  {
    label: 'Subjects',
    href: '/admin/subjects',
    icon: IconBook
  },
  {
    label: 'Grade-Subject Mappings',
    href: '/admin/grade-subjects',
    icon: IconLink
  },
  {
    label: 'Academic Calendar',
    href: '/admin/academic-calendar',
    icon: IconCalendar
  },
  {
    label: 'Time Slots',
    href: '/admin/time-slots',
    icon: IconClock
  },
  {
    label: 'Teaching Assignments',
    href: '/admin/teaching-assignments',
    icon: IconClipboardList
  },
  {
    label: 'Timetables',
    href: '/admin/timetables',
    icon: IconTable
  }
];

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-600" />
          ) : (
            <Menu className="w-6 h-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">TimetableAI</h1>
              <p className="text-sm text-gray-500">K-12 Scheduler</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.id}
                href={item.href as any}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-blue-50 text-blue-700 border border-blue-200" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">
            Powered by AI • Version 1.0
          </div>
        </div>
      </div>
    </>
  )
}