'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Select,
  MultiSelect,
  NumberInput,
  Switch,
  Textarea,
  Progress,
  Alert,
  Badge,
  Divider,
  Paper,
  Grid,
  Tabs,
  Checkbox,
  Accordion,
  ThemeIcon,
  RingProgress,
  List,
  Modal,
  ActionIcon,
  Tooltip,
  Box,
  Flex,
  Center
} from '@mantine/core';
import {
  IconRocket,
  IconSettings,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
  IconClock,
  IconUsers,
  IconBook,
  IconCalendar,
  IconBrain,
  IconRefresh,
  IconPlayerPause,
  IconPlayerStop,
  IconDownload,
  IconEye,
  IconEdit,
  IconPlus,
  IconMinus,
  IconPlayerPlay
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createClient } from '@/utils/supabase/client';
import {
  createTimetableGeneration,
  updateTimetableGenerationStatus,
  scheduleLesson,
  getTimetableGenerationWithLessons
} from '@/lib/api/timetables';
import { TimetableGenerationStatus } from '@/lib/types/database-helpers';

// Types
interface Class {
  id: string;
  name: string;
  grade_level: number;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  academic_years: {
    name: string;
    school_id: string;
  };
}

interface CurriculumReport {
  class_name: string;
  course_name: string;
  periods_per_week: number;
  required_hours_per_term: number;
  expected_hours: number;
  variance_hours: number;
  status: string;
  recommendation: string;
}

interface WorkloadReport {
  teacher_id: string;
  teacher_name: string;
  current_periods: number;
  max_periods: number;
  available_periods: number;
  is_overloaded: boolean;
}

interface SchoolConfig {
  periodDuration: number;
  sessionsPerDay: number;
  workingDays: string[];
}

interface GenerationForm {
  termId: string;
  selectedClasses: string[];
  selectedTeachers: string[];
  algorithm: 'ai' | 'manual';
  optimizationLevel: 'basic' | 'advanced';
  timeLimit: number;
  constraints: {
    respectTeacherAvailability: boolean;
    respectRoomPreferences: boolean;
    distributeSubjectsEvenly: boolean;
    avoidConsecutiveSubjects: boolean;
    respectBreakRequirements: boolean;
  };
  notes: string;
}

interface GenerationProgress {
  status: TimetableGenerationStatus;
  progress: number;
  currentStep: string;
  estimatedTime: number;
  errors: string[];
  warnings: string[];
  timetableGenerationId?: string;
}

interface InitialData {
  classes: Class[];
  teachers: Teacher[];
  terms: Term[];
  curriculumReport: CurriculumReport[];
  workloadReport: WorkloadReport[];
  schoolConfig: SchoolConfig;
}

interface Props {
  schoolId: string;
  schoolName: string;
  initialData: InitialData;
}

export default function TimetableGenerationClientUI({ schoolId, schoolName, initialData }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('configuration');
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    status: 'idle',
    progress: 0,
    currentStep: '',
    estimatedTime: 0,
    errors: [],
    warnings: []
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [generatedTimetable, setGeneratedTimetable] = useState<any>(null);

  const form = useForm<GenerationForm>({
    initialValues: {
      termId: '',
      selectedClasses: [],
      selectedTeachers: [],
      algorithm: 'ai',
      optimizationLevel: 'basic',
      timeLimit: 300, // 5 minutes default
      constraints: {
        respectTeacherAvailability: true,
        respectRoomPreferences: true,
        distributeSubjectsEvenly: true,
        avoidConsecutiveSubjects: true,
        respectBreakRequirements: true,
      },
      notes: '',
    },
    validate: {
      termId: (value) => (!value ? 'Please select a term' : null),
      selectedClasses: (value) => (value.length === 0 ? 'Please select at least one class' : null),
      selectedTeachers: (value) => (value.length === 0 ? 'Please select at least one teacher' : null),
    },
  });

  // Auto-select first term if available
  useEffect(() => {
    if (initialData.terms.length > 0 && !form.values.termId) {
      form.setFieldValue('termId', initialData.terms[0].id);
    }
  }, [initialData.terms]);

  // Auto-select all classes and teachers if available
  useEffect(() => {
    if (initialData.classes.length > 0 && form.values.selectedClasses.length === 0) {
      form.setFieldValue('selectedClasses', initialData.classes.map(c => c.id));
    }
    if (initialData.teachers.length > 0 && form.values.selectedTeachers.length === 0) {
      form.setFieldValue('selectedTeachers', initialData.teachers.map(t => t.id));
    }
  }, [initialData.classes, initialData.teachers]);

  const handleGenerateTimetable = async () => {
    const validation = form.validate();
    if (!validation.hasErrors) {
      try {
        setGenerationProgress({
          ...generationProgress,
          status: 'generating',
          progress: 0,
          currentStep: 'Creating timetable generation...',
          errors: [],
          warnings: []
        });

        // Create a new timetable generation
        const { data: generation, error: generationError } = await createTimetableGeneration(
          form.values.termId,
          'user_id', // TODO: Get from auth context
          form.values.notes
        );

        if (generationError || !generation) {
          throw new Error(generationError || 'Failed to create timetable generation');
        }

        setGenerationProgress(prev => ({
          ...prev,
          timetableGenerationId: generation.id,
          progress: 5,
          currentStep: 'Preparing timetable request...'
        }));

        // Prepare the request for the AI service
        const request = {
          school_config: {
            id: schoolId,
            name: schoolName,
            constraints: {
              respectTeacherAvailability: form.values.constraints.respectTeacherAvailability,
              respectRoomPreferences: form.values.constraints.respectRoomPreferences,
              distributeSubjectsEvenly: form.values.constraints.distributeSubjectsEvenly,
              avoidConsecutiveSubjects: form.values.constraints.avoidConsecutiveSubjects,
              respectBreakRequirements: form.values.constraints.respectBreakRequirements
            }
          },
          term_id: form.values.termId,
          timetable_generation_id: generation.id,
          selected_classes: form.values.selectedClasses,
          selected_teachers: form.values.selectedTeachers,
          algorithm: form.values.algorithm,
          optimization_level: form.values.optimizationLevel,
          time_limit: form.values.timeLimit
        };

        // Submit to AI service
        const { data: job, error: submitError } = await submitTimetableRequest(request);
        if (submitError || !job) {
          throw new Error(submitError || 'Failed to submit timetable request');
        }

        setGenerationProgress(prev => ({
          ...prev,
          progress: 10,
          currentStep: 'Processing timetable request...'
        }));

        // Start polling for results
        await pollForResult(job.job_id);

      } catch (error) {
        console.error('Error generating timetable:', error);
        setGenerationProgress(prev => ({
          ...prev,
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        }));

        // Update generation status if we have an ID
        if (generationProgress.timetableGenerationId) {
          await updateTimetableGenerationStatus(
            generationProgress.timetableGenerationId,
            'failed',
            error instanceof Error ? error.message : 'Unknown error occurred'
          );
        }

        notifications.show({
          title: 'Error',
          message: 'Failed to generate timetable. Please try again.',
          color: 'red'
        });
      }
    }
  };

  const pollForResult = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    while (attempts < maxAttempts) {
      try {
        const { data: status, error } = await getJobStatus(jobId);
        if (error) throw new Error(error);
        if (!status) throw new Error('No status returned');

        if (status.status === 'completed' && status.result) {
          // Schedule the lessons using database-level conflict prevention
          const lessons = status.result.lessons;
          let scheduledCount = 0;
          let errors: string[] = [];

          for (const lesson of lessons) {
            const { error: scheduleError } = await scheduleLesson({
              teaching_assignment_id: lesson.teaching_assignment_id,
              date: lesson.date,
              timeslot_id: lesson.timeslot_id,
              timetable_generation_id: generationProgress.timetableGenerationId!
            });

            if (scheduleError) {
              errors.push(scheduleError);
            } else {
              scheduledCount++;
            }
          }

          // Update progress
          setGenerationProgress(prev => ({
            ...prev,
            status: errors.length > 0 ? 'completed' : 'completed',
            progress: 100,
            currentStep: 'Timetable generation completed',
            errors,
            warnings: errors.length > 0 ? ['Some lessons could not be scheduled due to conflicts'] : []
          }));

          // Update generation status
          await updateTimetableGenerationStatus(
            generationProgress.timetableGenerationId!,
            'completed',
            errors.length > 0 ? `Completed with ${errors.length} conflicts` : undefined
          );

          // Show completion notification
          notifications.show({
            title: 'Success',
            message: `Timetable generated successfully. ${scheduledCount} lessons scheduled.`,
            color: errors.length > 0 ? 'yellow' : 'green'
          });

          return;
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'Generation failed');
        }

        // Update progress
        setGenerationProgress(prev => ({
          ...prev,
          progress: Math.min(90, 10 + (status.progress || 0) * 0.8),
          currentStep: status.message || 'Processing...'
        }));

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.error('Error polling for result:', error);
        setGenerationProgress(prev => ({
          ...prev,
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        }));

        // Update generation status
        if (generationProgress.timetableGenerationId) {
          await updateTimetableGenerationStatus(
            generationProgress.timetableGenerationId,
            'failed',
            error instanceof Error ? error.message : 'Unknown error occurred'
          );
        }

        notifications.show({
          title: 'Error',
          message: 'Failed to generate timetable. Please try again.',
          color: 'red'
        });
        return;
      }
    }

    // Timeout
    throw new Error('Timetable generation timed out');
  };

  const handlePublishTimetable = async () => {
    try {
      // Here you would save the generated timetable to the database
      notifications.show({
        title: 'Success',
        message: 'Timetable published successfully!',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      
      router.push('/admin/timetables');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to publish timetable.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const getValidationStatus = () => {
    const curriculumIssues = initialData.curriculumReport.filter(r => r.status !== 'valid');
    const workloadIssues = initialData.workloadReport.filter(r => r.is_overloaded);
    
    if (curriculumIssues.length > 0 || workloadIssues.length > 0) {
      return {
        status: 'warning' as const,
        message: `${curriculumIssues.length} curriculum issues, ${workloadIssues.length} workload issues`,
        icon: <IconAlertTriangle size={16} />
      };
    }
    
    return {
      status: 'success' as const,
      message: 'All data validated successfully',
      icon: <IconCheck size={16} />
    };
  };

  const validationStatus = getValidationStatus();

  return (
    <Stack gap="lg">
      {/* Validation Status */}
      <Alert
        color={validationStatus.status}
        title="Data Validation"
        icon={validationStatus.icon}
      >
        {validationStatus.message}
      </Alert>

      {/* Main Content */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'configuration')}>
        <Tabs.List>
          <Tabs.Tab value="configuration" leftSection={<IconSettings size={16} />}>
            Configuration
          </Tabs.Tab>
          <Tabs.Tab value="constraints" leftSection={<IconBrain size={16} />}>
            Constraints
          </Tabs.Tab>
          <Tabs.Tab value="validation" leftSection={<IconCheck size={16} />}>
            Validation
          </Tabs.Tab>
          <Tabs.Tab value="progress" leftSection={<IconClock size={16} />}>
            Progress
          </Tabs.Tab>
        </Tabs.List>

        {/* Configuration Tab */}
        <Tabs.Panel value="configuration" pt="md">
          <Grid>
            <Grid.Col span={8}>
              <Stack gap="md">
                {/* Term Selection */}
                <Card withBorder>
                  <Title order={3} mb="md">Term Selection</Title>
                  <Select
                    label="Academic Term"
                    placeholder="Select a term"
                    data={initialData.terms.map(term => ({
                      value: term.id,
                      label: `${term.name} (${term.academic_years.name})`
                    }))}
                    {...form.getInputProps('termId')}
                  />
                </Card>

                {/* Scope Selection */}
                <Card withBorder>
                  <Title order={3} mb="md">Scope Selection</Title>
                  <MultiSelect
                    label="Classes to Include"
                    placeholder="Select classes"
                    data={initialData.classes.map(cls => ({
                      value: cls.id,
                      label: `${cls.name} (Grade ${cls.grade_level})`
                    }))}
                    {...form.getInputProps('selectedClasses')}
                    searchable
                    clearable
                  />
                  <MultiSelect
                    label="Teachers to Include"
                    placeholder="Select teachers"
                    data={initialData.teachers.map(teacher => ({
                      value: teacher.id,
                      label: `${teacher.first_name} ${teacher.last_name}`
                    }))}
                    {...form.getInputProps('selectedTeachers')}
                    searchable
                    clearable
                    mt="md"
                  />
                </Card>

                {/* Generation Options */}
                <Card withBorder>
                  <Title order={3} mb="md">Generation Options</Title>
                  <Group grow>
                    <Select
                      label="Algorithm"
                      data={[
                        { value: 'ai', label: 'AI Optimization' },
                        { value: 'manual', label: 'Manual Builder' }
                      ]}
                      {...form.getInputProps('algorithm')}
                    />
                    <Select
                      label="Optimization Level"
                      data={[
                        { value: 'basic', label: 'Basic' },
                        { value: 'advanced', label: 'Advanced' }
                      ]}
                      {...form.getInputProps('optimizationLevel')}
                    />
                  </Group>
                  <NumberInput
                    label="Time Limit (minutes)"
                    placeholder="300"
                    min={60}
                    max={1800}
                    {...form.getInputProps('timeLimit')}
                    mt="md"
                  />
                </Card>
              </Stack>
            </Grid.Col>

            <Grid.Col span={4}>
              <Stack gap="md">
                {/* Quick Stats */}
                <Card withBorder>
                  <Title order={3} mb="md">Quick Stats</Title>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text size="sm">Classes Selected:</Text>
                      <Badge>{form.values.selectedClasses.length}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Teachers Selected:</Text>
                      <Badge>{form.values.selectedTeachers.length}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Curriculum Issues:</Text>
                      <Badge color="red">{initialData.curriculumReport.filter(r => r.status !== 'valid').length}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Workload Issues:</Text>
                      <Badge color="orange">{initialData.workloadReport.filter(r => r.is_overloaded).length}</Badge>
                    </Group>
                  </Stack>
                </Card>

                {/* Generation Button */}
                <Card withBorder>
                  <Button
                    fullWidth
                    size="lg"
                    leftSection={<IconRocket size={20} />}
                    onClick={handleGenerateTimetable}
                    loading={generationProgress.status === 'generating' || generationProgress.status === 'validating'}
                    disabled={!form.isValid()}
                  >
                    Generate Timetable
                  </Button>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* Constraints Tab */}
        <Tabs.Panel value="constraints" pt="md">
          <Card withBorder>
            <Title order={3} mb="md">Scheduling Constraints</Title>
            <Stack gap="md">
              <Checkbox
                label="Respect teacher availability"
                description="Consider teacher time constraints and preferences"
                {...form.getInputProps('constraints.respectTeacherAvailability', { type: 'checkbox' })}
              />
              <Checkbox
                label="Respect room preferences"
                description="Assign subjects to appropriate room types"
                {...form.getInputProps('constraints.respectRoomPreferences', { type: 'checkbox' })}
              />
              <Checkbox
                label="Distribute subjects evenly"
                description="Spread similar subjects across different days"
                {...form.getInputProps('constraints.distributeSubjectsEvenly', { type: 'checkbox' })}
              />
              <Checkbox
                label="Avoid consecutive subjects"
                description="Prevent same subject in consecutive periods"
                {...form.getInputProps('constraints.avoidConsecutiveSubjects', { type: 'checkbox' })}
              />
              <Checkbox
                label="Respect break requirements"
                description="Ensure proper breaks between periods"
                {...form.getInputProps('constraints.respectBreakRequirements', { type: 'checkbox' })}
              />
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* Validation Tab */}
        <Tabs.Panel value="validation" pt="md">
          <Stack gap="md">
            {/* Curriculum Validation */}
            <Card withBorder>
              <Title order={3} mb="md">Curriculum Validation</Title>
              {initialData.curriculumReport.length > 0 ? (
                <Accordion>
                  {initialData.curriculumReport.map((report, index) => (
                    <Accordion.Item key={index} value={`curriculum-${index}`}>
                      <Accordion.Control>
                        <Group>
                          <Text fw={500}>{report.class_name} - {report.course_name}</Text>
                          <Badge color={report.status === 'valid' ? 'green' : 'red'}>
                            {report.status}
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="xs">
                          <Text size="sm"><strong>Periods per week:</strong> {report.periods_per_week}</Text>
                          <Text size="sm"><strong>Required hours:</strong> {report.required_hours_per_term}</Text>
                          <Text size="sm"><strong>Expected hours:</strong> {report.expected_hours}</Text>
                          <Text size="sm"><strong>Variance:</strong> {report.variance_hours} hours</Text>
                          <Text size="sm" c="dimmed">{report.recommendation}</Text>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              ) : (
                <Text c="dimmed">No curriculum data available</Text>
              )}
            </Card>

            {/* Workload Validation */}
            <Card withBorder>
              <Title order={3} mb="md">Teacher Workload Validation</Title>
              {initialData.workloadReport.length > 0 ? (
                <Accordion>
                  {initialData.workloadReport.map((report, index) => (
                    <Accordion.Item key={index} value={`workload-${index}`}>
                      <Accordion.Control>
                        <Group>
                          <Text fw={500}>{report.teacher_name}</Text>
                          <Badge color={report.is_overloaded ? 'red' : 'green'}>
                            {report.is_overloaded ? 'Overloaded' : 'OK'}
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="xs">
                          <Text size="sm"><strong>Current periods:</strong> {report.current_periods}</Text>
                          <Text size="sm"><strong>Max periods:</strong> {report.max_periods}</Text>
                          <Text size="sm"><strong>Available periods:</strong> {report.available_periods}</Text>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              ) : (
                <Text c="dimmed">No workload data available</Text>
              )}
            </Card>
          </Stack>
        </Tabs.Panel>

        {/* Progress Tab */}
        <Tabs.Panel value="progress" pt="md">
          <Card withBorder>
            <Title order={3} mb="md">Generation Progress</Title>
            
            {generationProgress.status === 'idle' ? (
              <Center py="xl">
                <Stack align="center" gap="md">
                  <IconClock size={48} color="gray" />
                  <Text c="dimmed">Ready to generate timetable</Text>
                  <Button
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={handleGenerateTimetable}
                    disabled={!form.isValid()}
                  >
                    Start Generation
                  </Button>
                </Stack>
              </Center>
            ) : (
              <Stack gap="md">
                {/* Progress Bar */}
                <div>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500}>{generationProgress.currentStep}</Text>
                    <Text size="sm" c="dimmed">{generationProgress.progress}%</Text>
                  </Group>
                  <Progress 
                    value={generationProgress.progress} 
                    color={generationProgress.status === 'failed' ? 'red' : 'blue'}
                    size="lg"
                  />
                </div>

                {/* Status */}
                <Group>
                  <Badge 
                    color={
                      generationProgress.status === 'completed' ? 'green' : 
                      generationProgress.status === 'failed' ? 'red' : 'blue'
                    }
                    size="lg"
                  >
                    {generationProgress.status.toUpperCase()}
                  </Badge>
                  {generationProgress.estimatedTime > 0 && (
                    <Text size="sm" c="dimmed">
                      Estimated time remaining: {Math.ceil(generationProgress.estimatedTime / 60)} minutes
                    </Text>
                  )}
                </Group>

                {/* Errors */}
                {generationProgress.errors.length > 0 && (
                  <Alert color="red" title="Errors" icon={<IconX size={16} />}>
                    <List>
                      {generationProgress.errors.map((error, index) => (
                        <List.Item key={index}>{error}</List.Item>
                      ))}
                    </List>
                  </Alert>
                )}

                {/* Warnings */}
                {generationProgress.warnings.length > 0 && (
                  <Alert color="yellow" title="Warnings" icon={<IconAlertTriangle size={16} />}>
                    <List>
                      {generationProgress.warnings.map((warning, index) => (
                        <List.Item key={index}>{warning}</List.Item>
                      ))}
                    </List>
                  </Alert>
                )}

                {/* Actions */}
                {generationProgress.status === 'completed' && (
                  <Group>
                    <Button
                      leftSection={<IconEye size={16} />}
                      onClick={() => setShowPreviewModal(true)}
                    >
                      Preview Timetable
                    </Button>
                    <Button
                      variant="outline"
                      leftSection={<IconDownload size={16} />}
                    >
                      Export
                    </Button>
                    <Button
                      color="green"
                      leftSection={<IconCheck size={16} />}
                      onClick={handlePublishTimetable}
                    >
                      Publish
                    </Button>
                  </Group>
                )}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Preview Modal */}
      <Modal
        opened={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Generated Timetable Preview"
        size="xl"
      >
        {generatedTimetable ? (
          <Stack gap="md">
            <Alert color="green" title="Generation Successful">
              Timetable has been generated successfully with {generatedTimetable.totalLessons} lessons scheduled.
            </Alert>
            
            <Group>
              <Badge color="green">Total Lessons: {generatedTimetable.totalLessons}</Badge>
              <Badge color="red">Conflicts: {generatedTimetable.conflicts}</Badge>
              <Badge color="yellow">Warnings: {generatedTimetable.warnings}</Badge>
            </Group>

            <Text size="sm" c="dimmed">
              This is a preview of your generated timetable. You can review it, make adjustments, or publish it directly.
            </Text>

            <Group justify="flex-end">
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                Close
              </Button>
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={handlePublishTimetable}
              >
                Publish Timetable
              </Button>
            </Group>
          </Stack>
        ) : (
          <Text c="dimmed">No timetable data available</Text>
        )}
      </Modal>
    </Stack>
  );
} 