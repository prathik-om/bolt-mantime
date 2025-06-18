'use client'

import { useState } from 'react'
import { Calendar, Eye, Download, Filter, Search, Clock } from 'lucide-react'
import { useTimetableGenerations, useScheduledLessons } from '@/hooks/use-timetable-generations'
import { Card } from '@mantine/core'

type ViewMode = 'class' | 'teacher' | 'room'

export function TimetableView() {
  const [viewMode, setViewMode] = useState<ViewMode>('class')
  const [selectedGeneration, setSelectedGeneration] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: generations } = useTimetableGenerations('demo-term-id')
  const { data: lessons } = useScheduledLessons(selectedGeneration || undefined)

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const periods = Array.from({ length: 8 }, (_, i) => i + 1)

  const renderTimetableGrid = () => {
    if (!lessons || lessons.length === 0) {
      return (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schedule Data</h3>
          <p className="text-gray-600">Select a timetable generation to view the schedule.</p>
        </Card>
      )
    }

    return (
      <Card className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 p-3 text-left font-semibold text-gray-900 min-w-[100px]">
                Period
              </th>
              {days.map(day => (
                <th key={day} className="border border-gray-200 p-3 text-center font-semibold text-gray-900 min-w-[180px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period} className="hover:bg-gray-50">
                <td className="border border-gray-200 p-3 font-medium text-gray-700 bg-gray-50">
                  Period {period}
                </td>
                {days.map(day => {
                  // Find lesson for this day/period combination
                  const lesson = lessons.find(l => {
                    const lessonDay = new Date(l.date).toLocaleDateString('en-US', { weekday: 'long' })
                    return lessonDay === day && l.time_slot?.slot_name?.includes(period.toString())
                  })
                  
                  return (
                    <td key={`${day}-${period}`} className="border border-gray-200 p-2">
                      {lesson ? (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-md border border-blue-200">
                          <div className="space-y-1">
                            <div className="font-semibold text-blue-900 text-sm">
                              {lesson.teaching_assignment?.class_offering?.subject?.code || 'Subject'}
                            </div>
                            <div className="text-xs text-blue-700">
                              {lesson.teaching_assignment?.teacher?.first_name} {lesson.teaching_assignment?.teacher?.last_name}
                            </div>
                            {lesson.room && (
                              <div className="text-xs text-blue-600">
                                Room: {lesson.room.name}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-12 flex items-center justify-center text-gray-400 text-sm">
                          Free
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timetable View</h1>
            <p className="text-gray-600">View and manage generated timetables</p>
          </div>
        </div>
        
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Generation Selection */}
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Timetable
              </label>
              <select
                value={selectedGeneration}
                onChange={(e) => setSelectedGeneration(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Choose a timetable...</option>
                {generations?.filter(generation => generation.id != null).map(generation => (
                  <option key={generation.id} value={generation.id!}>
                    {generation.notes ?? generation.id}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Tabs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                View Mode
              </label>
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {[
                  { id: 'class', label: 'Class', icon: '🏫' },
                  { id: 'teacher', label: 'Teacher', icon: '👨‍🏫' },
                  { id: 'room', label: 'Room', icon: '🏢' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as ViewMode)}
                    className={`
                      px-3 py-1 rounded-md text-sm font-medium transition-colors
                      ${viewMode === mode.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    <span className="mr-1">{mode.icon}</span>
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
        </div>
      </div>

      {/* Generation Info */}
      {selectedGeneration && generations && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">
                  {generations.find(g => g.id === selectedGeneration)?.notes || 'Timetable Generation'}
                </div>
                <div className="text-sm text-gray-600">
                  Generated on {new Date(generations.find(g => g.id === selectedGeneration)?.generated_at || '').toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Eye className="w-4 h-4" />
              <span>{lessons?.length || 0} scheduled lessons</span>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Schedule
          </h3>
        </div>

        {renderTimetableGrid()}
      </div>
    </div>
  )
}