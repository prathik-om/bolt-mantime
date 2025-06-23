'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  IconSearch, 
  IconFilter, 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconEye,
  IconBrain,
  IconHandStop,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconClock
} from '@tabler/icons-react'
import { getTeacherAssignments, deleteTeacherAssignment } from '@/lib/api/teacher-assignments'
import { useSchoolContext } from '@/hooks/use-school-context'

interface TeacherAssignment {
  id: string
  teacher_id: string
  teacher_name: string
  course_id: string
  course_name: string
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
}

interface TeacherAssignmentListProps {
  onEdit?: (assignment: TeacherAssignment) => void
  onView?: (assignment: TeacherAssignment) => void
  onNew?: () => void
}

export default function TeacherAssignmentList({ 
  onEdit, 
  onView, 
  onNew 
}: TeacherAssignmentListProps) {
  const { schoolId } = useSchoolContext()
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterAssignmentType, setFilterAssignmentType] = useState('')
  const [filterWorkloadStatus, setFilterWorkloadStatus] = useState('')
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')

  useEffect(() => {
    if (schoolId && selectedAcademicYear && selectedTerm) {
      loadAssignments()
    }
  }, [schoolId, selectedAcademicYear, selectedTerm])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      const data = await getTeacherAssignments(schoolId, selectedAcademicYear, selectedTerm)
      setAssignments(data)
    } catch (error) {
      console.error('Error loading assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (assignmentId: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      try {
        await deleteTeacherAssignment(assignmentId)
        await loadAssignments()
      } catch (error) {
        console.error('Error deleting assignment:', error)
      }
    }
  }

  const getAssignmentTypeIcon = (type: string) => {
    switch (type) {
      case 'ai': return <IconBrain className="w-4 h-4" />
      case 'manual': return <IconHandStop className="w-4 h-4" />
      case 'ai_suggested': return <IconAlertTriangle className="w-4 h-4" />
      default: return <IconClock className="w-4 h-4" />
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
      case 'available': return <IconCheck className="w-4 h-4" />
      case 'moderate': return <IconClock className="w-4 h-4" />
      case 'high': return <IconAlertTriangle className="w-4 h-4" />
      case 'overloaded': return <IconX className="w-4 h-4" />
      default: return <IconClock className="w-4 h-4" />
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.class_offering_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.department_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDepartment = !filterDepartment || assignment.department_name === filterDepartment
    const matchesType = !filterAssignmentType || assignment.assignment_type === filterAssignmentType
    const matchesWorkload = !filterWorkloadStatus || assignment.workload_status === filterWorkloadStatus

    return matchesSearch && matchesDepartment && matchesType && matchesWorkload
  })

  const departments = [...new Set(assignments.map(a => a.department_name))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Teacher Assignments</h2>
          <p className="text-muted-foreground">
            Manage teacher course assignments and workload
          </p>
        </div>
        <Button onClick={onNew}>
          <IconPlus className="w-4 h-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <IconFilter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Year</label>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2025-2026">2025-2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment Type</label>
              <Select value={filterAssignmentType} onValueChange={setFilterAssignmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="ai">AI Assignment</SelectItem>
                  <SelectItem value="manual">Manual Assignment</SelectItem>
                  <SelectItem value="ai_suggested">AI Suggested</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Workload Status</label>
              <Select value={filterWorkloadStatus} onValueChange={setFilterWorkloadStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="overloaded">Overloaded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle>Assignments ({filteredAssignments.length})</CardTitle>
          <CardDescription>
            Showing {filteredAssignments.length} of {assignments.length} assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No assignments found</p>
              </div>
            ) : (
              filteredAssignments.map((assignment) => (
                <div 
                  key={assignment.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getAssignmentTypeIcon(assignment.assignment_type)}
                      <Badge className={getAssignmentTypeColor(assignment.assignment_type)}>
                        {assignment.assignment_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="font-medium">{assignment.teacher_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.course_name} • {assignment.class_offering_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.department_name} • {assignment.academic_year} {assignment.term}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {getWorkloadStatusIcon(assignment.workload_status)}
                        <Badge className={getWorkloadStatusColor(assignment.workload_status)}>
                          {assignment.workload_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {assignment.hours_per_week}/{assignment.max_hours_per_week} hours
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.utilization_percentage?.toFixed(1)}% utilization
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(assignment)}
                        >
                          <IconEye className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(assignment)}
                        >
                          <IconEdit className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(assignment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <IconTrash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 