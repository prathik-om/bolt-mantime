'use client'

import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { TeacherList } from './teacher-list'
import { TeacherForm } from './teacher-form'
import { useTeachers } from '@/hooks/use-teachers'
import { Button, TextInput, Select, Card, Group, Stack } from '@mantine/core'

export function TeacherManagement() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')

  const { data: teachers, isLoading } = useTeachers()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-600 mt-1">Manage teaching staff and their subject assignments</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Teacher</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <TextInput
              placeholder="Search teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Select
                value={filterDepartment}
                onChange={value => setFilterDepartment(value || 'all')}
                placeholder="Select department"
                data={[
                  { value: 'all', label: 'All Departments' },
                  { value: 'mathematics', label: 'Mathematics' },
                  { value: 'science', label: 'Science' },
                  { value: 'english', label: 'English' },
                  { value: 'social_studies', label: 'Social Studies' },
                  { value: 'arts', label: 'Arts' },
                  { value: 'physical_education', label: 'Physical Education' }
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Teacher List */}
      <TeacherList />

      {/* Add Teacher Modal */}
      {isAddModalOpen && (
        <TeacherForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  )
}