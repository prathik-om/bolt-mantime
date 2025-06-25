'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Card,
  Button,
  Tabs,
  Modal,
  Badge,
  Grid,
  Paper,
  ThemeIcon,
  RingProgress,
  Progress,
  Alert,
  ActionIcon,
  Tooltip,
  Box,
  Divider
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUsers,
  IconBrain,
  IconActivity,
  IconChartBar,
  IconPlus,
  IconEdit,
  IconEye,
  IconTrash,
  IconAlertCircle,
  IconCircleCheck,
  IconClock,
  IconBook,
  IconUserCheck
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/lib/database.types';
import TeacherAssignmentForm from '@/components/teacher-assignments/TeacherAssignmentForm';
import Link from 'next/link';
import { displayError, validateTeachingAssignmentForm } from '@/lib/utils/error-handling';
import { useRouter } from 'next/navigation';

type TeachingAssignment = Database['public']['Tables']['teaching_assignments']['Row'];
type Teacher = Database['public']['Tables']['teachers']['Row'];
type ClassOffering = Database['public']['Tables']['class_offerings']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];
type Class = Database['public']['Tables']['classes']['Row'];
type Department = Database['public']['Tables']['departments']['Row'];

interface ExtendedTeachingAssignment extends TeachingAssignment {
  teacher: Teacher;
  class_offering: ClassOffering & {
    course: Course;
    class: Class;
  };
}

interface TeacherWorkload {
  teacher_id: string;
  teacher_name: string;
  department_name: string;
  current_hours_per_week: number;
  max_hours_per_week: number;
  current_courses_count: number;
  max_courses_count: number;
  workload_status: 'available' | 'moderate' | 'high' | 'overloaded';
  utilization_percentage: number;
  available_hours: number;
}

interface AssignmentStats {
  total_assignments: number;
  total_teachers: number;
  total_courses: number;
  workload_distribution: {
    available: number;
    moderate: number;
    high: number;
    overloaded: number;
  };
}

interface InitialStats {
  assignmentsCount: number;
  teachersCount: number;
  coursesCount: number;
  classOfferingsCount: number;
}

interface TeachingAssignmentsClientUIProps {
  schoolId: string;
  initialStats: InitialStats;
}

export default function TeachingAssignmentsClientUI({ schoolId, initialStats }: TeachingAssignmentsClientUIProps) {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedAssignment, setSelectedAssignment] = useState<ExtendedTeachingAssignment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();
  const router = useRouter();

  // Fetch teaching assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teaching-assignments', schoolId],
    queryFn: async (): Promise<ExtendedTeachingAssignment[]> => {
      const { data, error } = await supabase
        .from('teaching_assignments')
        .select(`
          *,
          teacher:teachers(*),
          class_offering:class_offerings(
            *,
            course:courses(*),
            class:classes(*)
          )
        `)
        .eq('school_id', schoolId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId
  });

  // Fetch teacher workload
  const { data: teacherWorkloads, isLoading: workloadLoading } = useQuery({
    queryKey: ['teacher-workloads', schoolId],
    queryFn: async (): Promise<TeacherWorkload[]> => {
      const { data, error } = await supabase
        .rpc('get_teacher_workload_insights', {
          school_id: schoolId,
          academic_year_id: '', // TODO: Get from context
          term_id: '' // TODO: Get from context
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId
  });

  // Calculate stats
  const stats: AssignmentStats = {
    total_assignments: assignments?.length || 0,
    total_teachers: new Set(assignments?.map(a => a.teacher_id)).size,
    total_courses: new Set(assignments?.map(a => a.class_offering.course_id)).size,
    workload_distribution: {
      available: teacherWorkloads?.filter(t => t.workload_status === 'available').length || 0,
      moderate: teacherWorkloads?.filter(t => t.workload_status === 'moderate').length || 0,
      high: teacherWorkloads?.filter(t => t.workload_status === 'high').length || 0,
      overloaded: teacherWorkloads?.filter(t => t.workload_status === 'overloaded').length || 0,
    }
  };

  // Delete assignment mutation
  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data, error } = await supabase
        .from('teaching_assignments')
        .delete()
        .eq('id', assignmentId)
        .select();
      
      if (error) throw error;
      return data || [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-workloads'] });
      notifications.show({
        title: 'Success',
        message: 'Teaching assignment deleted successfully',
        color: 'green',
        icon: <IconCircleCheck size={16} />
      });
      setIsDeleteModalOpen(false);
      router.refresh();
    },
    onError: (error) => {
      displayError(error, notifications);
    }
  });

  const handleNewAssignment = () => {
    setSelectedAssignment(null);
    setIsFormOpen(true);
  };

  const handleEditAssignment = (assignment: ExtendedTeachingAssignment) => {
    setSelectedAssignment(assignment);
    setIsFormOpen(true);
  };

  const handleViewAssignment = (assignment: ExtendedTeachingAssignment) => {
    setSelectedAssignment(assignment);
    setIsDetailOpen(true);
  };

  const handleDeleteAssignment = (assignment: ExtendedTeachingAssignment) => {
    setSelectedAssignment(assignment);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedAssignment) {
      deleteMutation.mutate(selectedAssignment.id);
    }
  };

  const getWorkloadColor = (status: string) => {
    switch (status) {
      case 'available': return 'green';
      case 'moderate': return 'yellow';
      case 'high': return 'orange';
      case 'overloaded': return 'red';
      default: return 'gray';
    }
  };

  const getWorkloadIcon = (status: string) => {
    switch (status) {
      case 'available': return <IconCircleCheck size={16} />;
      case 'moderate': return <IconClock size={16} />;
      case 'high': return <IconAlertCircle size={16} />;
      case 'overloaded': return <IconAlertCircle size={16} />;
      default: return <IconClock size={16} />;
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // Validate form data
      const formErrors = validateTeachingAssignmentForm(values);
      if (Object.keys(formErrors).length > 0) {
        const firstError = Object.values(formErrors)[0];
        toast.error(firstError);
        setLoading(false);
        return;
      }

      if (selectedAssignment) {
        // Update
        const { data, error } = await supabase
          .from("teaching_assignments")
          .update({
            hours_per_week: values.hours_per_week,
            assignment_type: values.assignment_type,
          })
          .eq("id", selectedAssignment.id)
          .select(`
            *,
            teachers (*),
            class_offerings (
              *,
              classes (*),
              courses (*)
            )
          `);
        
        if (error) throw error;
        
        // Update local state immediately
        setSelectedAssignment(prevAssignment => 
          prevAssignment ? { ...prevAssignment, ...values } : null
        );
        
        toast.success("Teaching assignment updated!");
      } else {
        // Insert
        const insertData = {
          teacher_id: values.teacher_id,
          class_offering_id: values.class_offering_id,
          hours_per_week: values.hours_per_week,
          assignment_type: values.assignment_type,
        };
        
        const { data, error } = await supabase
          .from("teaching_assignments")
          .insert(insertData)
          .select(`
            *,
            teachers (*),
            class_offerings (
              *,
              classes (*),
              courses (*)
            )
          `);
        
        if (error) throw error;
        
        // Add new assignment to local state immediately
        if (data && data[0]) {
          setSelectedAssignment(data[0]);
        }
        
        toast.success("Teaching assignment added!");
      }
      setIsFormOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      displayError(err, toast);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAssignment) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("teaching_assignments")
        .delete()
        .eq("id", selectedAssignment.id)
        .select();
      
      if (error) throw error;
      
      // Remove assignment from local state immediately
      setSelectedAssignment(null);
      
      toast.success("Teaching assignment deleted!");
      setIsDeleteModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleDelete:', err);
      displayError(err, toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Page Header */}
        <div>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            component={Link}
            href="/admin/dashboard"
            mb="md"
          >
            Back to Dashboard
          </Button>
          
          <Title order={1}>Teaching Assignments</Title>
          <Text c="dimmed" mt="xs">
            Manage teacher assignments, workload distribution, and AI-powered scheduling insights.
          </Text>
        </div>

        {/* Stats Cards */}
        <Group grow>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconUsers size={24} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="lg" fw={600}>{initialStats.assignmentsCount}</Text>
                <Text size="sm" c="dimmed">Total Assignments</Text>
              </div>
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconActivity size={24} color="var(--mantine-color-green-6)" />
              <div>
                <Text size="lg" fw={600}>{initialStats.teachersCount}</Text>
                <Text size="sm" c="dimmed">Teachers</Text>
              </div>
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconBrain size={24} color="var(--mantine-color-purple-6)" />
              <div>
                <Text size="lg" fw={600}>{initialStats.coursesCount}</Text>
                <Text size="sm" c="dimmed">Courses</Text>
              </div>
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconChartBar size={24} color="var(--mantine-color-orange-6)" />
              <div>
                <Text size="lg" fw={600}>{initialStats.classOfferingsCount}</Text>
                <Text size="sm" c="dimmed">Class Offerings</Text>
              </div>
            </Group>
          </Card>
        </Group>

        {/* Main Content */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'dashboard')}>
          <Tabs.List>
            <Tabs.Tab
              value="dashboard"
              leftSection={<IconChartBar size={16} />}
            >
              Dashboard
            </Tabs.Tab>
            <Tabs.Tab
              value="assignments"
              leftSection={<IconUsers size={16} />}
            >
              Assignments
            </Tabs.Tab>
            <Tabs.Tab
              value="workload"
              leftSection={<IconUsers size={16} />}
            >
              Workload Analysis
            </Tabs.Tab>
            <Tabs.Tab
              value="ai-insights"
              leftSection={<IconBrain size={16} />}
            >
              AI Insights
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard" pt="xl">
            <Grid>
              {/* Stats Cards */}
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Card withBorder>
                  <Group>
                    <ThemeIcon size="lg" variant="light" color="blue">
                      <IconUsers size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                        Total Assignments
                      </Text>
                      <Text size="xl" fw={700}>
                        {stats.total_assignments}
                      </Text>
                    </div>
                  </Group>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 3 }}>
                <Card withBorder>
                  <Group>
                    <ThemeIcon size="lg" variant="light" color="green">
                      <IconUserCheck size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                        Teachers Assigned
                      </Text>
                      <Text size="xl" fw={700}>
                        {stats.total_teachers}
                      </Text>
                    </div>
                  </Group>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 3 }}>
                <Card withBorder>
                  <Group>
                    <ThemeIcon size="lg" variant="light" color="violet">
                      <IconBook size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                        Courses Covered
                      </Text>
                      <Text size="xl" fw={700}>
                        {stats.total_courses}
                      </Text>
                    </div>
                  </Group>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 3 }}>
                <Card withBorder>
                  <Group>
                    <ThemeIcon size="lg" variant="light" color="orange">
                      <IconActivity size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                        Available Teachers
                      </Text>
                      <Text size="xl" fw={700}>
                        {stats.workload_distribution.available}
                      </Text>
                    </div>
                  </Group>
                </Card>
              </Grid.Col>

              {/* Workload Distribution */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder>
                  <Text fw={500} mb="md">Workload Distribution</Text>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text size="sm">Available</Text>
                      <Badge color="green" variant="light">
                        {stats.workload_distribution.available}
                      </Badge>
                    </Group>
                    <Progress
                      value={(stats.workload_distribution.available / (teacherWorkloads?.length || 1)) * 100}
                      color="green"
                      size="sm"
                    />
                    
                    <Group justify="space-between">
                      <Text size="sm">Moderate</Text>
                      <Badge color="yellow" variant="light">
                        {stats.workload_distribution.moderate}
                      </Badge>
                    </Group>
                    <Progress
                      value={(stats.workload_distribution.moderate / (teacherWorkloads?.length || 1)) * 100}
                      color="yellow"
                      size="sm"
                    />
                    
                    <Group justify="space-between">
                      <Text size="sm">High</Text>
                      <Badge color="orange" variant="light">
                        {stats.workload_distribution.high}
                      </Badge>
                    </Group>
                    <Progress
                      value={(stats.workload_distribution.high / (teacherWorkloads?.length || 1)) * 100}
                      color="orange"
                      size="sm"
                    />
                    
                    <Group justify="space-between">
                      <Text size="sm">Overloaded</Text>
                      <Badge color="red" variant="light">
                        {stats.workload_distribution.overloaded}
                      </Badge>
                    </Group>
                    <Progress
                      value={(stats.workload_distribution.overloaded / (teacherWorkloads?.length || 1)) * 100}
                      color="red"
                      size="sm"
                    />
                  </Stack>
                </Card>
              </Grid.Col>

              {/* Recent Assignments */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder>
                  <Text fw={500} mb="md">Recent Assignments</Text>
                  <Stack gap="sm">
                    {assignments?.slice(0, 5).map((assignment) => (
                      <Paper key={assignment.id} p="sm" withBorder>
                        <Group justify="space-between">
                          <div>
                            <Text size="sm" fw={500}>
                              {assignment.teacher.first_name} {assignment.teacher.last_name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {assignment.class_offering.course.name} - {assignment.class_offering.class.name}
                            </Text>
                          </div>
                          <Badge
                            color={getWorkloadColor('available')}
                            variant="light"
                            size="sm"
                          >
                            {assignment.class_offering.periods_per_week} periods/week
                          </Badge>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="assignments" pt="xl">
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={500}>All Teaching Assignments</Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleNewAssignment}
                  size="sm"
                >
                  New Assignment
                </Button>
              </Group>

              {assignmentsLoading ? (
                <Text ta="center" py="xl">Loading assignments...</Text>
              ) : assignments?.length === 0 ? (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="No assignments found"
                  color="blue"
                >
                  Create your first teaching assignment to get started.
                </Alert>
              ) : (
                <Stack gap="sm">
                  {assignments?.map((assignment) => (
                    <Paper key={assignment.id} p="md" withBorder>
                      <Group justify="space-between">
                        <div style={{ flex: 1 }}>
                          <Group gap="md">
                            <div>
                              <Text fw={500}>
                                {assignment.teacher.first_name} {assignment.teacher.last_name}
                              </Text>
                              <Text size="sm" c="dimmed">
                                {assignment.teacher.email}
                              </Text>
                            </div>
                            <Divider orientation="vertical" />
                            <div>
                              <Text fw={500}>
                                {assignment.class_offering.course.name}
                              </Text>
                              <Text size="sm" c="dimmed">
                                {assignment.class_offering.class.name} • {assignment.class_offering.periods_per_week} periods/week
                              </Text>
                            </div>
                            <Divider orientation="vertical" />
                            <div>
                              <Badge
                                color={assignment.assignment_type === 'ai' ? 'blue' : 'green'}
                                variant="light"
                              >
                                {assignment.assignment_type === 'ai' ? 'AI-Assigned' : 'Manual'}
                              </Badge>
                            </div>
                          </Group>
                        </div>
                        
                        <Group gap="xs">
                          <Tooltip label="View details">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => handleViewAssignment(assignment)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Edit assignment">
                            <ActionIcon
                              variant="light"
                              color="yellow"
                              onClick={() => handleEditAssignment(assignment)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete assignment">
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => handleDeleteAssignment(assignment)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="workload" pt="xl">
            <Card withBorder>
              <Text fw={500} mb="md">Teacher Workload Analysis</Text>
              
              {workloadLoading ? (
                <Text ta="center" py="xl">Loading workload data...</Text>
              ) : teacherWorkloads?.length === 0 ? (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="No workload data available"
                  color="blue"
                >
                  Teacher workload data will appear here once assignments are created.
                </Alert>
              ) : (
                <Stack gap="md">
                  {teacherWorkloads?.map((workload) => (
                    <Paper key={workload.teacher_id} p="md" withBorder>
                      <Group justify="space-between">
                        <div style={{ flex: 1 }}>
                          <Text fw={500} mb="xs">
                            {workload.teacher_name}
                          </Text>
                          <Text size="sm" c="dimmed" mb="xs">
                            {workload.department_name}
                          </Text>
                          
                          <Group gap="lg">
                            <div>
                              <Text size="xs" c="dimmed">Current Hours</Text>
                              <Text size="sm" fw={500}>
                                {workload.current_hours_per_week}/{workload.max_hours_per_week}
                              </Text>
                            </div>
                            <div>
                              <Text size="xs" c="dimmed">Courses</Text>
                              <Text size="sm" fw={500}>
                                {workload.current_courses_count}/{workload.max_courses_count}
                              </Text>
                            </div>
                            <div>
                              <Text size="xs" c="dimmed">Available Hours</Text>
                              <Text size="sm" fw={500} c={workload.available_hours > 0 ? 'green' : 'red'}>
                                {workload.available_hours}
                              </Text>
                            </div>
                          </Group>
                        </div>
                        
                        <div style={{ textAlign: 'center' }}>
                          <RingProgress
                            size={60}
                            thickness={4}
                            sections={[
                              {
                                value: workload.utilization_percentage,
                                color: getWorkloadColor(workload.workload_status)
                              }
                            ]}
                            label={
                              <Text size="xs" ta="center">
                                {Math.round(workload.utilization_percentage)}%
                              </Text>
                            }
                          />
                          <Badge
                            color={getWorkloadColor(workload.workload_status)}
                            variant="light"
                            size="sm"
                            mt="xs"
                            leftSection={getWorkloadIcon(workload.workload_status)}
                          >
                            {workload.workload_status}
                          </Badge>
                        </div>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="ai-insights" pt="xl">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder>
                  <Group mb="md">
                    <ThemeIcon size="lg" variant="light" color="blue">
                      <IconBrain size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={500}>AI Assignment Suggestions</Text>
                      <Text size="sm" c="dimmed">
                        Get AI-powered teacher suggestions based on workload and qualifications
                      </Text>
                    </div>
                  </Group>
                  <Button
                    variant="light"
                    color="blue"
                    fullWidth
                    onClick={handleNewAssignment}
                  >
                    Try AI Suggestions
                  </Button>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder>
                  <Group mb="md">
                    <ThemeIcon size="lg" variant="light" color="green">
                      <IconActivity size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={500}>Workload Optimization</Text>
                      <Text size="sm" c="dimmed">
                        Analyze and optimize teacher workload distribution
                      </Text>
                    </div>
                  </Group>
                  <Button
                    variant="light"
                    color="green"
                    fullWidth
                    onClick={() => setActiveTab('workload')}
                  >
                    View Analysis
                  </Button>
                </Card>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>
        </Tabs>

        {/* Assignment Form Modal */}
        <Modal
          opened={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedAssignment ? 'Edit Assignment' : 'New Assignment'}
          size="lg"
        >
          <TeacherAssignmentForm
            assignment={selectedAssignment}
            schoolId={schoolId}
            onSuccess={() => {
              setIsFormOpen(false);
              setSelectedAssignment(null);
            }}
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedAssignment(null);
            }}
          />
        </Modal>

        {/* Assignment Detail Modal */}
        <Modal
          opened={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Assignment Details"
          size="lg"
        >
          {selectedAssignment && (
            <Stack>
              <Group>
                <ThemeIcon size="lg" variant="light" color="blue">
                  <IconUserCheck size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={500}>
                    {selectedAssignment.teacher.first_name} {selectedAssignment.teacher.last_name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {selectedAssignment.teacher.email}
                  </Text>
                </div>
              </Group>
              
              <Divider />
              
              <Group>
                <ThemeIcon size="lg" variant="light" color="green">
                  <IconBook size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={500}>
                    {selectedAssignment.class_offering.course.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {selectedAssignment.class_offering.class.name} • {selectedAssignment.class_offering.periods_per_week} periods/week
                  </Text>
                </div>
              </Group>
              
              <Group mt="md">
                <Button
                  variant="light"
                  color="yellow"
                  leftSection={<IconEdit size={16} />}
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleEditAssignment(selectedAssignment);
                  }}
                >
                  Edit Assignment
                </Button>
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleDeleteAssignment(selectedAssignment);
                  }}
                >
                  Delete Assignment
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Assignment"
          size="sm"
        >
          <Stack>
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Are you sure?"
              color="red"
            >
              This action cannot be undone. The teaching assignment will be permanently deleted.
            </Alert>
            
            {selectedAssignment && (
              <Paper p="md" withBorder>
                <Text size="sm" fw={500} mb="xs">
                  Assignment to delete:
                </Text>
                <Text size="sm" c="dimmed">
                  {selectedAssignment.teacher.first_name} {selectedAssignment.teacher.last_name} → {selectedAssignment.class_offering.course.name} ({selectedAssignment.class_offering.class.name})
                </Text>
              </Paper>
            )}
            
            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={confirmDelete}
                loading={deleteMutation.isPending}
              >
                Delete Assignment
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
} 