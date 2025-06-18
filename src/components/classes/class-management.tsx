'use client'

import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { ClassSectionList } from './class-section-list'
import { ClassSectionForm } from './class-section-form'
import { useClassSections } from '@/hooks/use-class-sections'
import { useSchoolContext } from '@/hooks/use-school-context'
import { Button, TextInput, Select, Card, Group, Stack } from '@mantine/core'

export function ClassManagement() {
  const { schoolId, schoolsLoading } = useSchoolContext()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGrade, setFilterGrade] = useState('all')

  const { data: classSections, isLoading } = useClassSections(schoolId || undefined)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
          <p className="text-gray-600 mt-1">Configure grades, sections, and subject assignments</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Class</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <TextInput
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Select
                value={filterGrade}
                onChange={value => setFilterGrade(value ?? 'all')}
                placeholder="Select grade"
                data={[
                  { value: 'all', label: 'All Grades' },
                  ...Array.from({ length: 12 }, (_, i) => ({
                    value: (i + 1).toString(),
                    label: `Grade ${i + 1}`
                  }))
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Class Section List */}
      <ClassSectionList 
        classSections={classSections || []}
        isLoading={isLoading}
        searchQuery={searchQuery}
        filterGrade={filterGrade}
      />

      {/* Add Class Section Modal */}
      {isAddModalOpen && (
        <ClassSectionForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  )
}