'use client'

import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { RoomList } from './room-list'
import { useRooms } from '@/hooks/use-rooms'
import { useSchoolContext } from '@/hooks/use-school-context'
import { Button, TextInput, Select, Card } from '@mantine/core'

export function RoomManagement() {
  const { schoolId, schoolsLoading } = useSchoolContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')

  const { data: rooms, isLoading } = useRooms(schoolId || undefined)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-600 mt-1">Configure classrooms and facilities</p>
        </div>
      </div>

      {/* Filters */}
      <Card withBorder>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <TextInput
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative flex-1 max-w-md">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Select
              value={filterType}
              onChange={value => setFilterType(value || 'all')}
              placeholder="Select type"
              data={[
                { value: 'all', label: 'All Types' },
                { value: 'classroom', label: 'Classroom' },
                { value: 'laboratory', label: 'Laboratory' },
                { value: 'computer-lab', label: 'Computer Lab' },
                { value: 'library', label: 'Library' },
                { value: 'gym', label: 'Gym' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Room List */}
      <RoomList
        rooms={rooms || []}
        isLoading={isLoading}
        searchQuery={searchQuery}
        filterType={filterType}
      />
    </div>
  )
}