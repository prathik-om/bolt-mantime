'use client'

import { useState } from 'react'
import { Zap, Clock, AlertTriangle, CheckCircle, Loader2, Settings } from 'lucide-react'
import { useSchoolStats } from '@/hooks/use-school-stats'
import { Card, Button, Alert, Text, Group, Stack, Select, NumberInput, Textarea } from '@mantine/core'
import { useSchoolContext } from '@/hooks/use-school-context'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Progress } from '@/components/ui/progress'
import { generateTimetable } from '@/lib/api/timetable-generator'
import { useTimetableValidation } from '@/hooks/use-timetable-validation'
import { createClient } from '@/utils/supabase/client'

interface TimetableGeneratorProps {
  termId: string
  departmentId?: string
  gradeLevel?: number
  onComplete?: (timetableId: string) => void
  onError?: (error: Error) => void
}

export function TimetableGenerator({
  termId,
  departmentId,
  gradeLevel,
  onComplete,
  onError
}: TimetableGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { school } = useSchoolContext()
  const { isValidating, isValid, errors, validateTimetable } = useTimetableValidation({
    schoolId: school.id
  })

  const { stats } = useSchoolStats()

  const readinessCheck = () => {
    const issues = []
    if (!stats?.teachers) issues.push('No teachers added')
    if (!stats?.subjects) issues.push('No subjects added')
    if (!stats?.classSections) issues.push('No classes added')
    if (!stats?.timeSlots) issues.push('No time slots configured')
    
    return issues
  }

  const readinessIssues = readinessCheck()
  const isReady = readinessIssues.length === 0

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      setProgress(0)

      const result = await generateTimetable({
        termId,
        schoolId: school.id,
        departmentId,
        gradeLevel
      })

      if (!result.success) {
        setError(result.errors.join('\n'))
        onError?.(new Error(result.errors.join('\n')))
        return
      }

      // Calculate progress
      if (result.lessonsScheduled && result.totalLessonsNeeded) {
        const progressPercent = (result.lessonsScheduled / result.totalLessonsNeeded) * 100
        setProgress(progressPercent)
      }

      // Validate the generated timetable
      const supabase = createClient()
      const { data: timetable } = await supabase
        .from('scheduled_lessons')
        .select(`
          id,
          teaching_assignments (
            teacher_id,
            class_offering_id
          ),
          time_slots (*)
        `)
        .eq('teaching_assignments.class_offerings.term_id', termId)

      const isValid = await validateTimetable(timetable || [])

      if (!isValid) {
        setError('Generated timetable violates school constraints')
        onError?.(new Error('Generated timetable violates school constraints'))
        return
      }

      onComplete?.(result.timetableId!)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate timetable'
      setError(message)
      onError?.(err instanceof Error ? err : new Error(message))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-sm p-8 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">AI Timetable Generator</h1>
            <p className="opacity-90">Intelligent scheduling with conflict detection</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm opacity-90">
          <Clock className="w-4 h-4" />
          <span>Ready to generate optimized schedules</span>
        </div>
      </Card>

      {/* System Readiness */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Readiness</h3>
        {isReady ? (
          <Alert variant="default" className="flex items-center space-x-3 p-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <div className="font-medium text-green-800">System Ready</div>
              <div className="text-sm text-green-600">All requirements met for timetable generation</div>
            </div>
          </Alert>
        ) : (
          <Alert variant="default" className="space-y-3">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-800">Configuration Issues</div>
                <div className="text-sm text-yellow-600">Please resolve the following issues:</div>
              </div>
            </div>
            <ul className="space-y-2 ml-6">
              {readinessIssues.map((issue, index) => (
                <li key={index} className="text-yellow-700 text-sm list-disc">{issue}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Card>

      {/* Generation Settings */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Generation Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Algorithm
            </label>
            <select
              value={generationSettings.algorithm}
              onChange={(e) => setGenerationSettings({ ...generationSettings, algorithm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="genetic">Genetic Algorithm</option>
              <option value="simulated_annealing">Simulated Annealing</option>
              <option value="constraint_satisfaction">Constraint Satisfaction</option>
              <option value="hybrid">Hybrid Approach</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Iterations
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              value={generationSettings.maxIterations}
              onChange={(e) => setGenerationSettings({ ...generationSettings, maxIterations: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      {/* Current Statistics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Data Overview</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats?.teachers || 0}</div>
            <div className="text-sm text-blue-800">Teachers</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{stats?.subjects || 0}</div>
            <div className="text-sm text-emerald-800">Subjects</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats?.classSections || 0}</div>
            <div className="text-sm text-purple-800">Classes</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats?.timeSlots || 0}</div>
            <div className="text-sm text-orange-800">Time Slots</div>
          </div>
        </div>
      </Card>

      {/* Generation Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Generate Timetable</h3>
            <p className="text-gray-600">Create optimized schedules using AI algorithms</p>
          </div>
          
          <Button
            onClick={handleGenerate}
            disabled={!isReady || isGenerating || isValidating}
            className="mt-4"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Generating...' : 'Generate Timetable'}
          </Button>
        </div>

        {(isGenerating || progress > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <p className="text-sm whitespace-pre-line">{error}</p>
          </Alert>
        )}

        {errors.length > 0 && !error && (
          <Alert variant="warning">
            <p className="text-sm whitespace-pre-line">
              {errors.join('\n')}
            </p>
          </Alert>
        )}
      </Card>
    </div>
  )
}