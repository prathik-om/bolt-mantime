'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  IconUsers, 
  IconBrain, 
  IconHandStop, 
  IconClock, 
  IconAlertTriangle,
  IconCheck,
  IconX
} from '@tabler/icons-react'
import { getTeacherAssignmentStats, getTeacherWorkloadInsights } from '@/lib/api/teacher-assignments'
import { useSchoolContext } from '@/hooks/use-school-context'

interface AssignmentStats {
  assignmentTypes: Record<string, number>
  workloadDistribution: Record<string, number>
  totalAssignments: number
  totalTeachers: number
}

interface WorkloadInsight {
  teacher_id: string
  teacher_name: string
  department_name: string
  current_hours_per_week: number
  max_hours_per_week: number
  current_courses_count: number
  max_courses_count: number
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded'
  available_hours: number
  utilization_percentage: number
  recommended_for_new_assignments: boolean
}

export default function TeacherAssignmentDashboard() {
  const { schoolId } = useSchoolContext()
  const [stats, setStats] = useState<AssignmentStats | null>(null)
  const [workloadInsights, setWorkloadInsights] = useState<WorkloadInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('')
  const [selectedTerm, setSelectedTerm] = useState<string>('')

  useEffect(() => {
    if (schoolId && selectedAcademicYear && selectedTerm) {
      loadDashboardData()
    }
  }, [schoolId, selectedAcademicYear, selectedTerm])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      if (!schoolId) {
        console.error('School ID is required')
        return
      }
      const [statsData, workloadData] = await Promise.all([
        getTeacherAssignmentStats(schoolId, selectedAcademicYear, selectedTerm),
        getTeacherWorkloadInsights(schoolId, selectedAcademicYear, selectedTerm)
      ])
      setStats(statsData || { assignmentTypes: {}, workloadDistribution: {}, totalAssignments: 0, totalTeachers: 0 })
      
      // Type guard to check if workloadData is an array of WorkloadInsight objects
      const isValidWorkloadData = Array.isArray(workloadData) && 
        workloadData.length > 0 && 
        'teacher_id' in workloadData[0] && 
        'teacher_name' in workloadData[0]
      
      setWorkloadInsights(isValidWorkloadData ? (workloadData as unknown as WorkloadInsight[]) : [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Assignment Dashboard</h1>
          <p className="text-muted-foreground">
            Manage teacher assignments and monitor workload distribution
          </p>
        </div>
        <Button>
          <IconUsers className="w-4 h-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAssignments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all teachers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Assignments</CardTitle>
            <IconBrain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.assignmentTypes?.ai || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalAssignments ? Math.round((stats.assignmentTypes?.ai || 0) / stats.totalAssignments * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Assignments</CardTitle>
            <IconHandStop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.assignmentTypes?.manual || 0}</div>
            <p className="text-xs text-muted-foreground">
              Admin overrides
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
            <p className="text-xs text-muted-foreground">
              With assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="workload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workload">Workload Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignment Types</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="workload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Workload Distribution</CardTitle>
              <CardDescription>
                Current workload status across all teachers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workloadInsights.map((teacher) => (
                  <div key={teacher.teacher_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getWorkloadStatusIcon(teacher.workload_status)}
                        <Badge className={getWorkloadStatusColor(teacher.workload_status)}>
                          {teacher.workload_status}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">{teacher.teacher_name}</p>
                        <p className="text-sm text-muted-foreground">{teacher.department_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {teacher.current_hours_per_week}/{teacher.max_hours_per_week} hours
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {teacher.utilization_percentage.toFixed(1)}% utilization
                      </p>
                      {teacher.recommended_for_new_assignments && (
                        <Badge variant="secondary" className="mt-1">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Type Distribution</CardTitle>
              <CardDescription>
                Breakdown of AI vs Manual assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.assignmentTypes && Object.entries(stats.assignmentTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {type === 'ai' && <IconBrain className="w-4 h-4" />}
                      {type === 'manual' && <IconHandStop className="w-4 h-4" />}
                      {type === 'ai_suggested' && <IconAlertTriangle className="w-4 h-4" />}
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{count}</span>
                      <span className="text-sm text-muted-foreground">
                        ({stats.totalAssignments ? Math.round(count / stats.totalAssignments * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Assignment Insights</CardTitle>
              <CardDescription>
                Recommendations and optimization suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Workload Optimization</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {workloadInsights.filter(t => t.workload_status === 'overloaded').length} teachers are currently overloaded.
                    Consider redistributing assignments for better balance.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Available Resources</h4>
                  <p className="text-sm text-green-700 mt-1">
                    {workloadInsights.filter(t => t.recommended_for_new_assignments).length} teachers are available for new assignments.
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900">Department Alignment</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Review assignments to ensure teachers are primarily assigned to their department courses.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 