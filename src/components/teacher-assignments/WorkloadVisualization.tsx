'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  IconChartBar, 
  IconChartPie, 
  IconUsers, 
  IconClock,
  IconAlertTriangle,
  IconCircleCheck,
  IconX
} from '@tabler/icons-react'
import { getTeacherWorkloadInsights } from '@/lib/api/teacher-assignments'
import { useSchoolContext } from '@/hooks/use-school-context'

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

interface WorkloadVisualizationProps {
  academicYear: string
  term: string
}

export default function WorkloadVisualization({ 
  academicYear, 
  term 
}: WorkloadVisualizationProps) {
  const { schoolId } = useSchoolContext()
  const [workloadData, setWorkloadData] = useState<WorkloadInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [chartType, setChartType] = useState<'utilization' | 'distribution' | 'capacity'>('utilization')

  useEffect(() => {
    if (schoolId && academicYear && term) {
      loadWorkloadData()
    }
  }, [schoolId, academicYear, term])

  const loadWorkloadData = async () => {
    try {
      setLoading(true)
      if (!schoolId) {
        console.error('School ID is required')
        return
      }
      const data = await getTeacherWorkloadInsights(schoolId, academicYear, term)
      
      // Type guard to check if data is an array of WorkloadInsight objects
      const isValidWorkloadData = Array.isArray(data) && 
        data.length > 0 && 
        'teacher_id' in data[0] && 
        'teacher_name' in data[0]
      
      setWorkloadData(isValidWorkloadData ? (data as unknown as WorkloadInsight[]) : [])
    } catch (error) {
      console.error('Error loading workload data:', error)
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
      case 'available': return <IconCircleCheck className="w-4 h-4" />
      case 'moderate': return <IconClock className="w-4 h-4" />
      case 'high': return <IconAlertTriangle className="w-4 h-4" />
      case 'overloaded': return <IconX className="w-4 h-4" />
      default: return <IconClock className="w-4 h-4" />
    }
  }

  const filteredData = selectedDepartment === 'all' 
    ? workloadData 
    : workloadData.filter(teacher => teacher.department_name === selectedDepartment)

  const departments = [...new Set(workloadData.map(t => t.department_name))]

  // Calculate statistics
  const totalTeachers = filteredData.length
  const availableTeachers = filteredData.filter(t => t.workload_status === 'available').length
  const moderateTeachers = filteredData.filter(t => t.workload_status === 'moderate').length
  const highTeachers = filteredData.filter(t => t.workload_status === 'high').length
  const overloadedTeachers = filteredData.filter(t => t.workload_status === 'overloaded').length

  const avgUtilization = filteredData.length > 0 
    ? filteredData.reduce((sum, t) => sum + t.utilization_percentage, 0) / filteredData.length 
    : 0

  const totalAvailableHours = filteredData.reduce((sum, t) => sum + t.available_hours, 0)
  const totalCurrentHours = filteredData.reduce((sum, t) => sum + t.current_hours_per_week, 0)
  const totalMaxHours = filteredData.reduce((sum, t) => sum + t.max_hours_per_week, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading workload data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utilization">Utilization Overview</SelectItem>
              <SelectItem value="distribution">Workload Distribution</SelectItem>
              <SelectItem value="capacity">Capacity Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredData.length} teachers • {selectedDepartment === 'all' ? 'All departments' : selectedDepartment}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              Active in {selectedDepartment === 'all' ? 'all departments' : selectedDepartment}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
            <IconChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {totalCurrentHours}/{totalMaxHours} hours used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Hours</CardTitle>
            <IconClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAvailableHours}</div>
            <p className="text-xs text-muted-foreground">
              Total remaining capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Teachers</CardTitle>
            <IconCircleCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTeachers}</div>
            <p className="text-xs text-muted-foreground">
              Ready for new assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workload Distribution Chart */}
      {chartType === 'distribution' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IconChartPie className="w-5 h-5" />
              <span>Workload Distribution</span>
            </CardTitle>
            <CardDescription>
              Distribution of teachers across workload status categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Bars */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconCircleCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Available</span>
                    <Badge className={getWorkloadStatusColor('available')}>
                      {availableTeachers}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {totalTeachers > 0 ? Math.round((availableTeachers / totalTeachers) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${totalTeachers > 0 ? (availableTeachers / totalTeachers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconClock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium">Moderate</span>
                    <Badge className={getWorkloadStatusColor('moderate')}>
                      {moderateTeachers}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {totalTeachers > 0 ? Math.round((moderateTeachers / totalTeachers) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full" 
                    style={{ width: `${totalTeachers > 0 ? (moderateTeachers / totalTeachers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconAlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">High</span>
                    <Badge className={getWorkloadStatusColor('high')}>
                      {highTeachers}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {totalTeachers > 0 ? Math.round((highTeachers / totalTeachers) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${totalTeachers > 0 ? (highTeachers / totalTeachers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconX className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">Overloaded</span>
                    <Badge className={getWorkloadStatusColor('overloaded')}>
                      {overloadedTeachers}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {totalTeachers > 0 ? Math.round((overloadedTeachers / totalTeachers) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${totalTeachers > 0 ? (overloadedTeachers / totalTeachers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Utilization Overview */}
      {chartType === 'utilization' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IconChartBar className="w-5 h-5" />
              <span>Utilization Overview</span>
            </CardTitle>
            <CardDescription>
              Individual teacher utilization percentages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredData.map((teacher) => (
                <div key={teacher.teacher_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getWorkloadStatusIcon(teacher.workload_status)}
                    <div>
                      <p className="font-medium">{teacher.teacher_name}</p>
                      <p className="text-sm text-muted-foreground">{teacher.department_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {teacher.current_hours_per_week}/{teacher.max_hours_per_week} hours
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {teacher.utilization_percentage.toFixed(1)}% utilization
                      </p>
                    </div>
                    
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          teacher.utilization_percentage < 60 ? 'bg-green-600' :
                          teacher.utilization_percentage < 80 ? 'bg-yellow-600' :
                          teacher.utilization_percentage < 100 ? 'bg-orange-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min(teacher.utilization_percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capacity Analysis */}
      {chartType === 'capacity' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IconUsers className="w-5 h-5" />
              <span>Capacity Analysis</span>
            </CardTitle>
            <CardDescription>
              Available capacity for new assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredData
                .filter(teacher => teacher.recommended_for_new_assignments)
                .sort((a, b) => b.available_hours - a.available_hours)
                .map((teacher) => (
                  <div key={teacher.teacher_id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <IconCircleCheck className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">{teacher.teacher_name}</p>
                        <p className="text-sm text-muted-foreground">{teacher.department_name}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-700">
                        {teacher.available_hours} hours available
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {teacher.current_courses_count}/{teacher.max_courses_count} courses
                      </p>
                    </div>
                  </div>
                ))}
              
              {filteredData.filter(teacher => teacher.recommended_for_new_assignments).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No teachers available for new assignments</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 