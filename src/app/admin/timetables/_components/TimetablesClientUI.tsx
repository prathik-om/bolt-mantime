'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  getScheduledLessonsClient, 
  getTimetableGenerationsClient, 
  getClassesForSchoolClient, 
  getTeachersForSchoolClient, 
  getTermsForSchoolClient,
  getDayName,
  formatTime,
  type TimetableLesson,
  type TimetableFilters
} from '@/lib/api/timetables-simple';
import { createClient } from '@/utils/supabase/client';

interface TimetablesClientUIProps {
  initialLessons: TimetableLesson[];
  initialGenerations: any[];
  initialClasses: any[];
  initialTeachers: any[];
  initialTerms: any[];
  schoolId: string;
}

export default function TimetablesClientUI({
  initialLessons,
  initialGenerations,
  initialClasses,
  initialTeachers,
  initialTerms,
  schoolId
}: TimetablesClientUIProps) {
  const [lessons, setLessons] = useState<TimetableLesson[]>(initialLessons);
  const [generations, setGenerations] = useState(initialGenerations);
  const [classes, setClasses] = useState(initialClasses);
  const [teachers, setTeachers] = useState(initialTeachers);
  const [terms, setTerms] = useState(initialTerms);
  const [loading, setLoading] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<TimetableLesson | null>(null);
  const [filters, setFilters] = useState<TimetableFilters>({});

  const handleFilterChange = async (key: keyof TimetableFilters, value: string | number | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    setLoading(true);
    try {
      const filteredLessons = await getScheduledLessonsClient(schoolId, newFilters);
      setLessons(filteredLessons);
    } catch (error) {
      console.error('Error filtering lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [newLessons, newGenerations] = await Promise.all([
        getScheduledLessonsClient(schoolId, filters),
        getTimetableGenerationsClient(schoolId)
      ]);
      setLessons(newLessons);
      setGenerations(newGenerations);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to create test data');
        return;
      }

      // Refresh the data to show the new generation and lessons
      await handleRefresh();
      alert(result.message || 'Test data created successfully!');
    } catch (error) {
      console.error('Error creating test data:', error);
      alert('Failed to create test data. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Date', 'Day', 'Start Time', 'End Time', 'Period', 'Slot',
      'Teacher', 'Teacher Email', 'Course', 'Course Code',
      'Class', 'Grade Level', 'Department'
    ];

    const csvContent = [
      headers.join(','),
      ...lessons.map(lesson => [
        lesson.date,
        getDayName(lesson.day_of_week),
        lesson.start_time,
        lesson.end_time,
        lesson.period_number || '',
        lesson.slot_name || '',
        lesson.teacher_name,
        lesson.teacher_email,
        lesson.course_name,
        lesson.course_code || '',
        lesson.class_name,
        lesson.grade_level,
        lesson.department_name
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="term">Term</Label>
              <Select onValueChange={(value) => handleFilterChange('termId', value === 'all' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="class">Class</Label>
              <Select onValueChange={(value) => handleFilterChange('classId', value === 'all' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} (Grade {cls.grade_level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="teacher">Teacher</Label>
              <Select onValueChange={(value) => handleFilterChange('teacherId', value === 'all' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            Export to CSV
          </Button>
        </div>
        <Button variant="secondary" onClick={handleCreateTestData} disabled={loading}>
          Create Test Data
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{lessons.length}</div>
            <div className="text-sm text-gray-600">Total Lessons</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(lessons.map(l => l.teacher_name)).size}
            </div>
            <div className="text-sm text-gray-600">Teachers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(lessons.map(l => l.class_name)).size}
            </div>
            <div className="text-sm text-gray-600">Classes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(lessons.map(l => l.course_name)).size}
            </div>
            <div className="text-sm text-gray-600">Courses</div>
          </CardContent>
        </Card>
      </div>

      {/* Lessons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No lessons found. Try adjusting your filters or create test data.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell>{new Date(lesson.date).toLocaleDateString()}</TableCell>
                      <TableCell>{getDayName(lesson.day_of_week)}</TableCell>
                      <TableCell>
                        {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                      </TableCell>
                      <TableCell>
                        {lesson.period_number && (
                          <Badge variant="secondary">{lesson.period_number}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lesson.teacher_name}</div>
                          <div className="text-sm text-gray-500">{lesson.teacher_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lesson.course_name}</div>
                          {lesson.course_code && (
                            <div className="text-sm text-gray-500">{lesson.course_code}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lesson.class_name}</div>
                          <div className="text-sm text-gray-500">Grade {lesson.grade_level}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lesson.department_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLesson(lesson)}
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Lesson Details</DialogTitle>
                            </DialogHeader>
                            {selectedLesson && (
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm font-medium">Date & Time</Label>
                                  <p className="text-sm text-gray-600">
                                    {new Date(selectedLesson.date).toLocaleDateString()} • {getDayName(selectedLesson.day_of_week)}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {formatTime(selectedLesson.start_time)} - {formatTime(selectedLesson.end_time)}
                                  </p>
                                </div>
                                <Separator />
                                <div>
                                  <Label className="text-sm font-medium">Teacher</Label>
                                  <p className="text-sm text-gray-600">{selectedLesson.teacher_name}</p>
                                  <p className="text-sm text-gray-500">{selectedLesson.teacher_email}</p>
                                </div>
                                <Separator />
                                <div>
                                  <Label className="text-sm font-medium">Course</Label>
                                  <p className="text-sm text-gray-600">{selectedLesson.course_name}</p>
                                  {selectedLesson.course_code && (
                                    <p className="text-sm text-gray-500">{selectedLesson.course_code}</p>
                                  )}
                                </div>
                                <Separator />
                                <div>
                                  <Label className="text-sm font-medium">Class</Label>
                                  <p className="text-sm text-gray-600">{selectedLesson.class_name}</p>
                                  <p className="text-sm text-gray-500">Grade {selectedLesson.grade_level}</p>
                                </div>
                                <Separator />
                                <div>
                                  <Label className="text-sm font-medium">Department</Label>
                                  <p className="text-sm text-gray-600">{selectedLesson.department_name}</p>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generations History */}
      {generations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Generated At</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generations.map((gen) => (
                    <TableRow key={gen.id}>
                      <TableCell>
                        {new Date(gen.generated_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{gen.terms?.name || 'Unknown Term'}</TableCell>
                      <TableCell>
                        <Badge variant={gen.status === 'completed' ? 'default' : 'secondary'}>
                          {gen.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{gen.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Generations Message */}
      {generations.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>No timetable generations found yet.</p>
              <p className="text-sm mt-2">
                Timetable generations will appear here once you generate schedules for your terms.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 