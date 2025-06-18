'use client'

import { useState } from 'react'
import { Edit2, Trash2, BookOpen, FlaskConical, Monitor, Users } from 'lucide-react'
import { Subject } from '@/types/database'
import { useDeleteSubject } from '@/hooks/use-subjects'
import { Button, Card, Group, Text, Stack, ActionIcon, Badge, Loader } from '@mantine/core'

interface SubjectListProps {
  subjects: Subject[]
  isLoading: boolean
  searchQuery: string
  filterType: string
}

export function SubjectList({ subjects, isLoading, searchQuery, filterType }: SubjectListProps) {
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const deleteSubject = useDeleteSubject()

  if (isLoading) {
    return <Loader />
  }

  // Filter subjects based on search and type
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = searchQuery === '' || 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subject.code && subject.code.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = filterType === 'all' || subject.subject_type === filterType

    return matchesSearch && matchesType
  })

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteSubject.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete subject:', error)
      }
    }
  }

  const getSubjectIcon = (subjectType: string | null, requiredRoomType: string | null) => {
    if (requiredRoomType === 'lab' || subjectType === 'practical') {
      return FlaskConical
    }
    if (requiredRoomType === 'computer_lab') {
      return Monitor
    }
    return BookOpen
  }

  if (filteredSubjects.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {searchQuery || filterType !== 'all' ? 'No Subjects Found' : 'No Subjects Added'}
        </h3>
        <p className="text-gray-600 mb-6">
          {searchQuery || filterType !== 'all' 
            ? 'Try adjusting your search or filter criteria.'
            : 'Start by adding subjects that will be taught in your school.'
          }
        </p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredSubjects.map((subject) => {
        const Icon = getSubjectIcon(subject.subject_type, subject.required_room_type)
        return (
          <Card key={subject.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingSubject(subject)}
                  className="text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(subject.id, subject.name)}
                  disabled={deleteSubject.isPending}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                {subject.code && (
                  <p className="text-sm text-gray-600">Code: {subject.code}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {subject.subject_type && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {subject.subject_type}
                  </span>
                )}
                {subject.required_room_type && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {subject.required_room_type}
                  </span>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}