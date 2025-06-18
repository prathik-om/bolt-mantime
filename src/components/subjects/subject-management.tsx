'use client'

import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { SubjectList } from './subject-list'
import { SubjectForm } from './subject-form'
import { useSubjects } from '@/hooks/use-subjects'
import { useSchoolContext } from '@/hooks/use-school-context'
import { Button, TextInput, Select, Card, Group, Stack } from '@mantine/core'

export function SubjectManagement() {
  const { schoolId, schoolsLoading } = useSchoolContext()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')

  const { data: subjects, isLoading } = useSubjects(schoolId || undefined)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
          <p className="text-gray-600 mt-1">Configure subjects and their requirements</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <TextInput
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Select
                value={filterType}
                onChange={value => setFilterType(value || 'all')}
                placeholder="Select type"
                data={[
                  { value: 'all', label: 'All Types' },
                  { value: 'core', label: 'Core Subjects' },
                  { value: 'elective', label: 'Electives' },
                  { value: 'practical', label: 'Practical' },
                  { value: 'language', label: 'Languages' },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Subject List */}
      <SubjectList 
        subjects={subjects || []}
        isLoading={isLoading}
        searchQuery={searchQuery}
        filterType={filterType}
      />

      {/* Add Subject Modal */}
      {isAddModalOpen && (
        <SubjectForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  )
}