'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  IconArrowLeft, 
  IconEdit, 
  IconTrash, 
  IconBrain, 
  IconHandStop,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconClock,
  IconUsers,
  IconBook,
  IconCalendar,
  IconNotes,
  IconActivity
} from '@tabler/icons-react'
import { getTeacherAssignmentById } from '@/lib/api/teacher-assignments'
import { useSchoolContext } from '@/hooks/use-school-context'

interface TeacherAssignmentDetail {
  id: string
  teacher_id: string
  teacher_name: string
  teacher_email?: string
  course_id: string
  course_name: string
  course_code?: string
  class_offering_id: string
  class_offering_name: string
  department_name: string
  academic_year: string
  term: string
  assignment_type: 'ai' | 'manual' | 'ai_suggested'
  hours_per_week: number
  max_hours_per_week: number
  max_courses_count: number
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded'
  utilization_percentage: number
  current_hours_per_week: number
  current_courses_count: number
  available_hours: number
  recommended_for_new_assignments: boolean
  ai_reasoning?: string
  conflict_details?: string
}

interface TeacherAssignmentDetailProps {
  assignmentId: string
  onBack?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export default function TeacherAssignmentDetail({ 
  assignmentId, 
  onBack, 
  onEdit, 
  onDelete 
}: TeacherAssignmentDetailProps) {
  const { schoolId } = useSchoolContext()
  const [assignment, setAssignment] = useState<TeacherAssignmentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (assignmentId && schoolId) {
      loadAssignmentDetail()
    }
  }, [assignmentId, schoolId])

  const loadAssignmentDetail = async () => {
    try {
      setLoading(true)
      const data = await getTeacherAssignmentById(assignmentId)
      setAssignment(data)
    } catch (error) {
      console.error('Error loading assignment detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAssignmentTypeIcon = (type: string) => {
    switch (type) {
      case 'ai': return <IconBrain className="w-5 h-5" />
      case 'manual': return <IconHandStop className="w-5 h-5" />
      case 'ai_suggested': return <IconAlertTriangle className="w-5 h-5" />
      default: return <IconClock className="w-5 h-5" />
    }
  }

  const getAssignmentTypeColor = (type: string) => {
    switch (type) {
      case 'ai': return 'bg-blue-100 text-blue-800'
      case 'manual': return 'bg-purple-100 text-purple-800'
      case 'ai_suggested': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWorkloadStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'overloaded': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWorkloadStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <IconCheck className="w-5 h-5" />
      case 'moderate': return <IconClock className="w-5 h-5" />
      case 'high': return <IconAlertTriangle className="w-5 h-5" />
      case 'overloaded': return <IconX className="w-5 h-5" />
      default: return <IconClock className="w-5 h-5" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading assignment details...</p>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Assignment not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <IconArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Assignment Details</h1>
            <p className="text-muted-foreground">
              {assignment.teacher_name} • {assignment.course_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onEdit && (
            <Button onClick={onEdit}>
              <IconEdit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <IconTrash className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Assignment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignment Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {getAssignmentTypeIcon(assignment.assignment_type)}
                <span>Assignment Overview</span>
                <Badge className={getAssignmentTypeColor(assignment.assignment_type)}>
                  {assignment.assignment_type.replace('_', ' ')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Teacher</p>
                  <p className="font-medium">{assignment.teacher_name}</p>
                  {assignment.teacher_email && (
                    <p className="text-sm text-muted-foreground">{assignment.teacher_email}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Course</p>
                  <p className="font-medium">{assignment.course_name}</p>
                  {assignment.course_code && (
                    <p className="text-sm text-muted-foreground">{assignment.course_code}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Class Offering</p>
                  <p className="font-medium">{assignment.class_offering_name}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="font-medium">{assignment.department_name}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Academic Year</p>
                  <p className="font-medium">{assignment.academic_year}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Term</p>
                  <p className="font-medium capitalize">{assignment.term}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={assignment.is_active ? "default" : "secondary"}>
                    {assignment.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workload Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <IconActivity className="w-5 h-5" />
                <span>Workload Information</span>
                <div className="flex items-center space-x-2">
                  {getWorkloadStatusIcon(assignment.workload_status)}
                  <Badge className={getWorkloadStatusColor(assignment.workload_status)}>
                    {assignment.workload_status}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Assignment Hours</p>
                  <p className="text-2xl font-bold">{assignment.hours_per_week}</p>
                  <p className="text-xs text-muted-foreground">hours per week</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Current Total</p>
                  <p className="text-2xl font-bold">{assignment.current_hours_per_week}</p>
                  <p className="text-xs text-muted-foreground">of {assignment.max_hours_per_week} max</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Utilization</p>
                  <p className="text-2xl font-bold">{assignment.utilization_percentage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">workload capacity</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold">{assignment.available_hours}</p>
                  <p className="text-xs text-muted-foreground">hours remaining</p>
                </div>
              </div>
              
              {assignment.recommended_for_new_assignments && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <IconCheck className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-green-800">Recommended for New Assignments</p>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    This teacher has sufficient capacity for additional assignments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Reasoning */}
          {assignment.ai_reasoning && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <IconBrain className="w-5 h-5" />
                  <span>AI Assignment Reasoning</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{assignment.ai_reasoning}</p>
              </CardContent>
            </Card>
          )}

          {/* Conflict Details */}
          {assignment.conflict_details && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-orange-800">
                  <IconAlertTriangle className="w-5 h-5" />
                  <span>Assignment Conflicts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-700">{assignment.conflict_details}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {assignment.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <IconNotes className="w-5 h-5" />
                  <span>Notes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{assignment.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Courses</span>
                <span className="font-medium">{assignment.current_courses_count}/{assignment.max_courses_count}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hours Utilization</span>
                <span className="font-medium">{assignment.utilization_percentage.toFixed(1)}%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Assignment Type</span>
                <Badge variant="outline" className={getAssignmentTypeColor(assignment.assignment_type)}>
                  {assignment.assignment_type.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(assignment.created_at)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDate(assignment.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {onEdit && (
                <Button className="w-full" onClick={onEdit}>
                  <IconEdit className="w-4 h-4 mr-2" />
                  Edit Assignment
                </Button>
              )}
              
              {onDelete && (
                <Button variant="destructive" className="w-full" onClick={onDelete}>
                  <IconTrash className="w-4 h-4 mr-2" />
                  Delete Assignment
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 