"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Group,
  Stack,
  ActionIcon,
  Tooltip,
  Badge,
  Text,
  Alert,
  MultiSelect,
  Checkbox,
  Divider,
  Paper,
  ThemeIcon,
  Collapse,
  Tabs,
  Progress,
  RingProgress,
  Grid,
  Box,
  Title,
  Switch,
  Accordion,
  List,
  Chip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconBook, 
  IconBook2, 
  IconSchool,
  IconInfoCircle,
  IconSettings,
  IconUsers,
  IconBulb,
  IconCheck,
  IconClock,
  IconCalendar,
  IconBrain,
  IconTarget,
  IconChartBar,
  IconFilter,
  IconSearch,
  IconRefresh,
  IconDownload,
  IconUpload,
  IconEye,
  IconEyeOff,
  IconAlertTriangle,
  IconCircleCheck,
  IconX,
  IconMinus,
  IconPlus as IconPlusSmall,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client';
import type { Database } from "@/types/database";
import { assignCourseToClasses, getCoursesWithClassOfferings } from "@/lib/api/course-class-offerings";
import { validateTermHours } from "@/lib/utils";
import { displayError, validateCourseForm, validateRequired, validateLength, validateGradeLevel, validatePositiveNumber } from '@/lib/utils/error-handling';

type Course = Database['public']['Tables']['courses']['Row'];
type Department = Database['public']['Tables']['departments']['Row'];
type Class = Database['public']['Tables']['classes']['Row'];
type ClassOffering = Database['public']['Tables']['class_offerings']['Row'];

interface EnhancedCourse extends Course {
  departments: { id: string; name: string; } | null;
  class_offerings: Array<{
    id: string;
    class_id: string;
    periods_per_week: number;
    required_hours_per_term: number | null;
    term_id: string;
    classes: { id: string; name: string; grade_level: number; school_id: string; } | null;
  }>;
}

interface SubjectsClientUIProps {
  initialSubjects: (Course & { departments: Department | null })[];
  departments: Department[];
  classes: Class[];
  schoolId: string;
}

interface SchedulingMetrics {
  totalCourses: number;
  totalClassOfferings: number;
  totalTeachingHours: number;
  averagePeriodsPerWeek: number;
  coursesWithCustomHours: number;
  coursesWithEqualDistribution: number;
  gradeCoverage: Record<number, number>;
  departmentDistribution: Record<string, number>;
}

export const SubjectsClientUI: React.FC<SubjectsClientUIProps> = ({ 
  initialSubjects, 
  departments,
  classes,
  schoolId 
}) => {
  const [subjects, setSubjects] = useState<EnhancedCourse[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);
  const [editingSubject, setEditingSubject] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [schedulingMetrics, setSchedulingMetrics] = useState<SchedulingMetrics | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [showSchedulingPreview, setShowSchedulingPreview] = useState(false);
  const router = useRouter();

  const form = useForm({
    initialValues: {
      name: "",
      code: "",
      department_id: "",
      grade_level: 9,
      total_hours_per_year: 120,
      hours_distribution_type: "equal" as "equal" | "custom",
      term_hours: {} as Record<string, number>,
      class_offerings: [] as Array<{
        class_id: string;
        periods_per_week: number;
        required_hours_per_term: number | null;
      }>,
      scheduling_priority: "normal" as "high" | "normal" | "low",
      allow_flexible_scheduling: true,
      max_consecutive_periods: 2,
      min_break_between_sessions: 1,
    },
    validate: {
      name: (value) => {
        const error = validateRequired(value, 'Subject name');
        if (error) return error;
        const lengthError = validateLength(value, 'Subject name', 1, 100);
        if (lengthError) return lengthError;
        return null;
      },
      department_id: (value) => validateRequired(value, 'Department'),
      grade_level: (value) => validateGradeLevel(value),
      class_offerings: (value) => (value.length === 0 ? "At least one class offering is required" : null),
      total_hours_per_year: (value) => validatePositiveNumber(value, 'Total hours per year'),
    },
  });

  // Load enhanced data with class offerings
  const loadEnhancedData = useCallback(async () => {
    try {
      const enhancedSubjects = await getCoursesWithClassOfferings(schoolId);
      setSubjects(enhancedSubjects);
      calculateSchedulingMetrics(enhancedSubjects);
    } catch (error) {
      console.error('Error loading enhanced data:', error);
      toast.error('Failed to load class offerings data');
    }
  }, [schoolId]);

  // Calculate scheduling metrics for AI algorithm
  const calculateSchedulingMetrics = useCallback((courses: EnhancedCourse[]) => {
    const metrics: SchedulingMetrics = {
      totalCourses: courses.length,
      totalClassOfferings: 0,
      totalTeachingHours: 0,
      averagePeriodsPerWeek: 0,
      coursesWithCustomHours: 0,
      coursesWithEqualDistribution: 0,
      gradeCoverage: {},
      departmentDistribution: {},
    };

    let totalPeriods = 0;
    let totalOfferings = 0;

    courses.forEach(course => {
      metrics.totalClassOfferings += course.class_offerings.length;
      totalOfferings += course.class_offerings.length;
      metrics.totalTeachingHours += course.total_hours_per_year || 0;

      if (course.hours_distribution_type === 'custom') {
        metrics.coursesWithCustomHours++;
      } else {
        metrics.coursesWithEqualDistribution++;
      }

      course.class_offerings.forEach(offering => {
        totalPeriods += offering.periods_per_week;
        
        if (offering.classes) {
          const grade = offering.classes.grade_level;
          metrics.gradeCoverage[grade] = (metrics.gradeCoverage[grade] || 0) + 1;
        }
      });

      if (course.departments) {
        const deptName = course.departments.name;
        metrics.departmentDistribution[deptName] = (metrics.departmentDistribution[deptName] || 0) + 1;
      }
    });

    metrics.averagePeriodsPerWeek = totalOfferings > 0 ? totalPeriods / totalOfferings : 0;
    setSchedulingMetrics(metrics);
  }, []);

  useEffect(() => {
    loadEnhancedData();
  }, [loadEnhancedData]);

  const openAddModal = () => {
    setEditingSubject(null);
    form.reset();
    setShowAdvanced(false);
    setModalOpen(true);
  };

  const openEditModal = async (subject: Course) => {
    setEditingSubject(subject);
    
    try {
      const enhancedSubjects = await getCoursesWithClassOfferings(schoolId);
      const enhancedSubject = enhancedSubjects.find(c => c.id === subject.id);
      
      if (enhancedSubject) {
        let parsedTermHours: Record<string, number> = {};
        if (subject.term_hours && typeof subject.term_hours === 'object' && !Array.isArray(subject.term_hours)) {
          parsedTermHours = subject.term_hours as Record<string, number>;
        }

        form.setValues({
          name: subject.name,
          code: subject.code || "",
          department_id: subject.department_id,
          grade_level: subject.grade_level || 9,
          total_hours_per_year: subject.total_hours_per_year || 120,
          hours_distribution_type: (subject.hours_distribution_type as 'equal' | 'custom') || 'equal',
          term_hours: parsedTermHours,
          class_offerings: enhancedSubject.class_offerings.map(offering => ({
            class_id: offering.class_id,
            periods_per_week: offering.periods_per_week,
            required_hours_per_term: offering.required_hours_per_term
          })),
          scheduling_priority: "normal",
          allow_flexible_scheduling: true,
          max_consecutive_periods: 2,
          min_break_between_sessions: 1,
        });
      }
    } catch (error) {
      console.error('Error loading subject for editing:', error);
      toast.error('Failed to load subject data for editing');
    }
    
    setModalOpen(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // Validate form data
      const formErrors = validateCourseForm(values);
      if (Object.keys(formErrors).length > 0) {
        const firstError = Object.values(formErrors)[0];
        toast.error(firstError);
        setLoading(false);
        return;
      }

      if (values.hours_distribution_type === 'custom') {
        const validation = validateTermHours(values.total_hours_per_year, values.term_hours);
        if (!validation.isValid) {
          toast.error(validation.message);
          setLoading(false);
          return;
        }
      }

      if (editingSubject) {
        const { data, error } = await createClient()
          .from("courses")
          .update({
            name: values.name,
            code: values.code,
            department_id: values.department_id,
            grade_level: values.grade_level,
            total_hours_per_year: values.total_hours_per_year,
            hours_distribution_type: values.hours_distribution_type,
            term_hours: values.term_hours,
          })
          .eq("id", editingSubject.id)
          .select(`
            *,
            departments (*)
          `);
        
        if (error) throw error;
        
        const result = await assignCourseToClasses(
          editingSubject.id,
          values.class_offerings.map(offering => ({
            class_id: offering.class_id,
            periods_per_week: offering.periods_per_week,
            required_hours_per_term: offering.required_hours_per_term,
          }))
        );
        if (result.success) {
          toast.success(result.message || "Subject updated successfully!");
        } else {
          toast.error(result.message || "Subject updated but class offerings failed");
        }
      } else {
        const { data, error } = await createClient()
          .from("courses")
          .insert({
            name: values.name,
            code: values.code,
            department_id: values.department_id,
            grade_level: values.grade_level,
            total_hours_per_year: values.total_hours_per_year,
            hours_distribution_type: values.hours_distribution_type,
            term_hours: values.term_hours,
            school_id: schoolId,
          })
          .select(`
            *,
            departments (*)
          `);
        
        if (error) throw error;
        
        if (data && data[0]) {
          const result = await assignCourseToClasses(data[0].id, values.class_offerings.map(offering => ({
            class_id: offering.class_id,
            periods_per_week: offering.periods_per_week,
            required_hours_per_term: offering.required_hours_per_term,
          })));
          if (result.success) {
            toast.success(result.message || "Subject created successfully!");
          } else {
            toast.error(result.message || "Subject created but class offerings failed");
          }
        }
      }
      
      setModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      displayError(err, toast);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      const { error } = await createClient()
        .from("courses")
        .delete()
        .eq("id", confirmDelete.id);
      
      if (error) throw error;
      
      toast.success("Subject deleted successfully!");
      setConfirmDelete(null);
      loadEnhancedData();
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleDelete:', err);
      toast.error(err.message || "Failed to delete subject");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter(subject => {
    if (filterDepartment !== "all" && subject.department_id !== filterDepartment) return false;
    if (filterGrade !== "all") {
      const grade = parseInt(filterGrade);
      const hasGrade = subject.class_offerings.some(offering => 
        offering.classes?.grade_level === grade
      );
      if (!hasGrade) return false;
    }
    return true;
  });

  const getClassOfferingsSummary = (subject: EnhancedCourse) => {
    const offerings = subject.class_offerings;
    if (!offerings.length) return "No offerings";
    
    const byGrade: Record<number, string[]> = {};
    offerings.forEach(offering => {
      if (offering.classes) {
        const grade = offering.classes.grade_level;
        if (!byGrade[grade]) byGrade[grade] = [];
        byGrade[grade].push(offering.classes.name);
      }
    });
    
    return Object.entries(byGrade)
      .map(([grade, classes]) => `Grade ${grade}: ${classes.join(', ')}`)
      .join('; ');
  };

  const getSchedulingComplexity = (subject: EnhancedCourse) => {
    const offerings = subject.class_offerings.length;
    const hours = subject.total_hours_per_year || 0;
    const hasCustomHours = subject.hours_distribution_type === 'custom';
    
    let score = 0;
    score += offerings * 2;
    score += hours / 10;
    score += hasCustomHours ? 5 : 0;
    
    if (score < 10) return { score, level: "Low", color: "green" };
    if (score < 20) return { score, level: "Medium", color: "yellow" };
    return { score, level: "High", color: "red" };
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>AI-Ready Class Offerings</Title>
          <Text size="sm" c="dimmed">
            Single source of truth for AI timetable generation algorithm
          </Text>
        </div>
        <Group>
          <Button 
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={loadEnhancedData}
          >
            Refresh Data
          </Button>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={openAddModal}
            color="blue"
          >
            Add Subject
          </Button>
        </Group>
      </Group>

      {/* Scheduling Metrics Dashboard */}
      {schedulingMetrics && (
        <Paper p="md" withBorder mb="lg">
          <Group mb="md">
            <ThemeIcon size="lg" variant="light" color="blue">
              <IconBrain size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600}>AI Scheduling Metrics</Text>
              <Text size="sm" c="dimmed">Key data points for algorithm optimization</Text>
            </div>
          </Group>
          
          <Grid>
            <Grid.Col span={3}>
              <Stack align="center" gap="xs">
                <RingProgress
                  size={80}
                  thickness={8}
                  sections={[
                    { value: (schedulingMetrics.totalClassOfferings / (schedulingMetrics.totalCourses * 12)) * 100, color: 'blue' }
                  ]}
                  label={
                    <Text ta="center" size="xs" fw={700}>
                      {schedulingMetrics.totalClassOfferings}
                    </Text>
                  }
                />
                <Text size="sm" fw={500}>Class Offerings</Text>
                <Text size="xs" c="dimmed">Total scheduled sessions</Text>
              </Stack>
            </Grid.Col>
            
            <Grid.Col span={3}>
              <Stack align="center" gap="xs">
                <RingProgress
                  size={80}
                  thickness={8}
                  sections={[
                    { value: (schedulingMetrics.totalTeachingHours / (schedulingMetrics.totalCourses * 200)) * 100, color: 'green' }
                  ]}
                  label={
                    <Text ta="center" size="xs" fw={700}>
                      {schedulingMetrics.totalTeachingHours}
                    </Text>
                  }
                />
                <Text size="sm" fw={500}>Teaching Hours</Text>
                <Text size="xs" c="dimmed">Annual instruction time</Text>
              </Stack>
            </Grid.Col>
            
            <Grid.Col span={3}>
              <Stack align="center" gap="xs">
                <RingProgress
                  size={80}
                  thickness={8}
                  sections={[
                    { value: (schedulingMetrics.averagePeriodsPerWeek / 10) * 100, color: 'orange' }
                  ]}
                  label={
                    <Text ta="center" size="xs" fw={700}>
                      {schedulingMetrics.averagePeriodsPerWeek.toFixed(1)}
                    </Text>
                  }
                />
                <Text size="sm" fw={500}>Avg Periods/Week</Text>
                <Text size="xs" c="dimmed">Per class offering</Text>
              </Stack>
            </Grid.Col>
            
            <Grid.Col span={3}>
              <Stack align="center" gap="xs">
                <RingProgress
                  size={80}
                  thickness={8}
                  sections={[
                    { value: (schedulingMetrics.coursesWithCustomHours / schedulingMetrics.totalCourses) * 100, color: 'purple' }
                  ]}
                  label={
                    <Text ta="center" size="xs" fw={700}>
                      {schedulingMetrics.coursesWithCustomHours}
                    </Text>
                  }
                />
                <Text size="sm" fw={500}>Custom Hours</Text>
                <Text size="xs" c="dimmed">Complex scheduling</Text>
              </Stack>
            </Grid.Col>
          </Grid>
        </Paper>
      )}

      {/* Filters */}
      <Paper p="md" withBorder mb="lg">
        <Group>
          <Select
            label="Filter by Department"
            placeholder="All departments"
            data={[
              { value: "all", label: "All Departments" },
              ...departments.map(dept => ({ value: dept.id, label: dept.name }))
            ]}
            value={filterDepartment}
            onChange={(value) => setFilterDepartment(value || "all")}
            style={{ minWidth: 200 }}
          />
          
          <Select
            label="Filter by Grade"
            placeholder="All grades"
            data={[
              { value: "all", label: "All Grades" },
              ...Array.from({ length: 12 }, (_, i) => ({
                value: (i + 1).toString(),
                label: `Grade ${i + 1}`
              }))
            ]}
            value={filterGrade}
            onChange={(value) => setFilterGrade(value || "all")}
            style={{ minWidth: 150 }}
          />
          
          <Button
            variant="light"
            leftSection={<IconEye size={16} />}
            onClick={() => setShowSchedulingPreview(!showSchedulingPreview)}
          >
            {showSchedulingPreview ? "Hide" : "Show"} AI Preview
          </Button>
        </Group>
      </Paper>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || "overview")}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="scheduling" leftSection={<IconBrain size={16} />}>
            AI Scheduling
          </Tabs.Tab>
          <Tabs.Tab value="analytics" leftSection={<IconTarget size={16} />}>
            Analytics
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          {filteredSubjects.length === 0 ? (
            <Alert 
              icon={<IconBook size={16} />}
              title="No subjects found"
              color="blue"
              variant="light"
            >
              {subjects.length === 0 
                ? "Get started by adding your first subject. Subjects are specific courses within departments that can be assigned to multiple grades and classes."
                : "No subjects match the current filters. Try adjusting your filter criteria."
              }
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Subject</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Class Offerings</Table.Th>
                  <Table.Th>Teaching Hours</Table.Th>
                  <Table.Th>Scheduling Complexity</Table.Th>
                  <Table.Th style={{ width: '120px' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredSubjects.map((subject) => {
                  const complexity = getSchedulingComplexity(subject);
                  return (
                    <Table.Tr key={subject.id}>
                      <Table.Td>
                        <Stack gap="xs">
                          <Text fw={500}>{subject.name}</Text>
                          {subject.code && (
                            <Badge variant="light" color="blue" size="sm">
                              {subject.code}
                            </Badge>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="green">
                          {subject.departments?.name || "No Department"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label={getClassOfferingsSummary(subject)} multiline w={300}>
                          <Badge variant="light" color="orange" style={{ cursor: 'pointer' }}>
                            {subject.class_offerings.length} offerings
                          </Badge>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap="xs">
                          <Badge variant="light" color="purple">
                            {subject.total_hours_per_year || 0} hours/year
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {subject.hours_distribution_type === 'custom' ? 'Custom' : 'Equal'} distribution
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap="xs">
                          <Badge variant="light" color={complexity.color}>
                            {complexity.level} ({complexity.score.toFixed(1)})
                          </Badge>
                          <Progress 
                            value={(complexity.score / 30) * 100} 
                            size="xs" 
                            color={complexity.color}
                          />
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="Edit subject">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => openEditModal(subject)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete subject">
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => setConfirmDelete(subject)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="scheduling" pt="md">
          <Paper p="md" withBorder>
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="blue">
                <IconBrain size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600}>AI Scheduling Configuration</Text>
                <Text size="sm" c="dimmed">Optimize your data for intelligent timetable generation</Text>
              </div>
            </Group>

            <Alert color="blue" title="AI Algorithm Ready" variant="light" icon={<IconCircleCheck size={16} />}>
              <Text size="sm">
                Your class offerings are configured as the single source of truth for the AI scheduling algorithm. 
                The system will use this data to generate optimal timetables considering:
              </Text>
              <List size="sm" mt="xs">
                <List.Item>Teaching hours and periods per week</List.Item>
                <List.Item>Department and grade-level constraints</List.Item>
                <List.Item>Custom vs equal hour distribution</List.Item>
                <List.Item>Class offering relationships</List.Item>
              </List>
            </Alert>

            {showSchedulingPreview && (
              <Accordion mt="md">
                {filteredSubjects.map((subject) => {
                  const complexity = getSchedulingComplexity(subject);
                  return (
                    <Accordion.Item key={subject.id} value={subject.id}>
                      <Accordion.Control>
                        <Group>
                          <Text fw={500}>{subject.name}</Text>
                          <Badge variant="light" color={complexity.color}>
                            {complexity.level} Complexity
                          </Badge>
                          <Badge variant="light" color="blue">
                            {subject.class_offerings.length} offerings
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Grid>
                          <Grid.Col span={6}>
                            <Text size="sm" fw={500} mb="xs">Class Offerings:</Text>
                            <Stack gap="xs">
                              {subject.class_offerings.map((offering, index) => (
                                <Group key={index} justify="space-between">
                                  <Text size="xs">
                                    {offering.classes?.name || 'Unknown Class'}:
                                  </Text>
                                  <Badge size="xs" variant="light">
                                    {offering.periods_per_week} periods/week
                                  </Badge>
                                  {offering.required_hours_per_term && (
                                    <Badge size="xs" variant="light" color="green">
                                      {offering.required_hours_per_term}h/term
                                    </Badge>
                                  )}
                                </Group>
                              ))}
                            </Stack>
                          </Grid.Col>
                          <Grid.Col span={6}>
                            <Text size="sm" fw={500} mb="xs">Scheduling Data:</Text>
                            <Stack gap="xs">
                              <Group gap="xs">
                                <Text size="xs">Total Hours:</Text>
                                <Badge size="xs" variant="light">
                                  {subject.total_hours_per_year || 0}h/year
                                </Badge>
                              </Group>
                              <Group gap="xs">
                                <Text size="xs">Distribution:</Text>
                                <Badge size="xs" variant="light" color={subject.hours_distribution_type === 'custom' ? 'orange' : 'green'}>
                                  {subject.hours_distribution_type === 'custom' ? 'Custom' : 'Equal'}
                                </Badge>
                              </Group>
                              <Group gap="xs">
                                <Text size="xs">Department:</Text>
                                <Badge size="xs" variant="light">
                                  {subject.departments?.name || 'None'}
                                </Badge>
                              </Group>
                            </Stack>
                          </Grid.Col>
                        </Grid>
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="analytics" pt="md">
          <Paper p="md" withBorder>
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="purple">
                <IconTarget size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Scheduling Analytics</Text>
                <Text size="sm" c="dimmed">Data insights for optimization</Text>
              </div>
            </Group>

            {schedulingMetrics && (
              <Grid>
                <Grid.Col span={6}>
                  <Text fw={500} mb="md">Grade Level Coverage</Text>
                  <Stack gap="xs">
                    {Object.entries(schedulingMetrics.gradeCoverage)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([grade, count]) => (
                        <Group key={grade} justify="space-between">
                          <Text size="sm">Grade {grade}</Text>
                          <Badge variant="light">{count} offerings</Badge>
                        </Group>
                      ))}
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Text fw={500} mb="md">Department Distribution</Text>
                  <Stack gap="xs">
                    {Object.entries(schedulingMetrics.departmentDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([dept, count]) => (
                        <Group key={dept} justify="space-between">
                          <Text size="sm">{dept}</Text>
                          <Badge variant="light">{count} courses</Badge>
                        </Group>
                      ))}
                  </Stack>
                </Grid.Col>
              </Grid>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? "Edit Subject" : "Add New Subject"}
        centered
        size="xl"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            {/* Basic Information */}
            <Paper p="md" withBorder>
              <Group mb="md">
                <ThemeIcon size="lg" variant="light" color="blue">
                  <IconBook2 size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={600}>Basic Information</Text>
                  <Text size="sm" c="dimmed">Subject details and department assignment</Text>
                </div>
              </Group>
              
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Subject Name"
                    placeholder="e.g., Mathematics, English Literature, Physics"
                    description="The full name of the subject"
                    {...form.getInputProps("name")}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Subject Code"
                    placeholder="e.g., MATH101, ENG201 (optional)"
                    description="Short code for the subject (optional)"
                    {...form.getInputProps("code")}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Department"
                    placeholder="Select a department"
                    description="Which department this subject belongs to"
                    data={departments.map(dept => ({ 
                      value: dept.id, 
                      label: dept.name 
                    }))}
                    {...form.getInputProps("department_id")}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Grade Level"
                    placeholder="e.g., 9"
                    description="Which grade level this subject is designed for"
                    min={1}
                    max={12}
                    {...form.getInputProps("grade_level")}
                    required
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Class Offerings */}
            <Paper p="md" withBorder>
              <Group mb="md">
                <ThemeIcon size="lg" variant="light" color="green">
                  <IconUsers size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={600}>Class Offerings</Text>
                  <Text size="sm" c="dimmed">Which grades and classes can take this subject</Text>
                </div>
              </Group>
              
              <Alert color="green" title="AI-Ready Configuration" variant="light" icon={<IconBrain size={16} />}>
                <Text size="sm">
                  This configuration serves as the primary data source for the AI scheduling algorithm. 
                  Each class offering defines a specific teaching session that needs to be scheduled.
                </Text>
              </Alert>

              <Stack gap="md" mt="md">
                <MultiSelect
                  label="Grade Levels"
                  placeholder="Select grade levels"
                  description="Which grades can take this subject"
                  data={[
                    { value: 'all', label: 'All Grades (1-12)' },
                    ...Array.from({ length: 12 }, (_, i) => ({
                      value: (i + 1).toString(),
                      label: `Grade ${i + 1}`
                    }))
                  ]}
                  value={(() => {
                    const selectedClassIds = form.values.class_offerings.map(o => o.class_id);
                    const selectedClasses = classes.filter(cls => selectedClassIds.includes(cls.id));
                    const selectedGradeLevels = [...new Set(selectedClasses.map(cls => cls.grade_level))];
                    
                    if (selectedGradeLevels.length === 12 && selectedGradeLevels.every((grade, index) => grade === index + 1)) {
                      return ['all'];
                    }
                    return selectedGradeLevels.map(g => g.toString());
                  })()}
                  onChange={(values) => {
                    let newOfferings: Array<{ class_id: string; periods_per_week: number; required_hours_per_term: number | null }> = [];
                    
                    if (values.includes('all')) {
                      newOfferings = classes.map(cls => ({
                        class_id: cls.id,
                        periods_per_week: 5,
                        required_hours_per_term: null
                      }));
                    } else {
                      const selectedGradeLevels = values.map(v => parseInt(v));
                      const selectedClasses = classes.filter(cls => selectedGradeLevels.includes(cls.grade_level));
                      
                      newOfferings = selectedClasses.map(cls => ({
                        class_id: cls.id,
                        periods_per_week: 5,
                        required_hours_per_term: null
                      }));
                    }
                    
                    form.setFieldValue('class_offerings', newOfferings);
                  }}
                  required
                />

                {form.values.class_offerings.length > 0 && (
                  <Paper p="md" withBorder variant="light">
                    <Text size="sm" fw={500} mb="md">Class Offering Details</Text>
                    <Stack gap="sm">
                      {form.values.class_offerings.map((offering, index) => {
                        const classInfo = classes.find(cls => cls.id === offering.class_id);
                        return (
                          <Group key={index} justify="space-between">
                            <Text size="sm">{classInfo?.name || 'Unknown Class'}</Text>
                            <Group gap="xs">
                              <NumberInput
                                size="xs"
                                placeholder="Periods"
                                min={1}
                                max={20}
                                style={{ width: 80 }}
                                {...form.getInputProps(`class_offerings.${index}.periods_per_week`)}
                              />
                              <Text size="xs">periods/week</Text>
                            </Group>
                          </Group>
                        );
                      })}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Paper>

            {/* Teaching Hours Configuration */}
            <Paper p="md" withBorder>
              <Group mb="md">
                <ThemeIcon size="lg" variant="light" color="purple">
                  <IconBook size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={600}>Teaching Hours</Text>
                  <Text size="sm" c="dimmed">Define how many hours this subject should be taught</Text>
                </div>
              </Group>

              <Grid>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Total Hours per Academic Year"
                    placeholder="Enter total teaching hours"
                    description="Total number of hours this subject should be taught across the entire academic year"
                    min={1}
                    max={1000}
                    {...form.getInputProps("total_hours_per_year")}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Hours Distribution Method"
                    placeholder="Select distribution method"
                    description="How to distribute hours across terms"
                    data={[
                      { value: "equal", label: "Equal across all terms" },
                      { value: "custom", label: "Custom hours per term" }
                    ]}
                    {...form.getInputProps("hours_distribution_type")}
                  />
                </Grid.Col>
              </Grid>

              {form.values.hours_distribution_type === "equal" && (
                <Alert color="blue" title="Equal Distribution" variant="light" icon={<IconCheck size={16} />}>
                  <Text size="sm">
                    Hours will be distributed equally across all terms. 
                    If the total hours don't divide evenly, the remainder will be distributed to the first terms.
                  </Text>
                </Alert>
              )}

              {form.values.hours_distribution_type === "custom" && (
                <Paper p="md" withBorder variant="light">
                  <Text size="sm" fw={500} mb="md">Custom Hours per Term</Text>
                  <Text size="sm" c="dimmed" mb="md">
                    Specify how many hours should be allocated to each term. 
                    Total should equal {form.values.total_hours_per_year} hours.
                  </Text>
                  <Grid>
                    {[1, 2, 3].map(termNumber => (
                      <Grid.Col span={4} key={termNumber}>
                        <NumberInput
                          label={`Term ${termNumber} Hours`}
                          placeholder={`Hours for Term ${termNumber}`}
                          min={0}
                          max={form.values.total_hours_per_year}
                          {...form.getInputProps(`term_hours.term${termNumber}`)}
                        />
                      </Grid.Col>
                    ))}
                  </Grid>
                  <Text size="xs" c="dimmed" mt="xs">
                    Total allocated: {Object.values(form.values.term_hours).reduce((sum, hours) => sum + (hours || 0), 0)} / {form.values.total_hours_per_year} hours
                  </Text>
                </Paper>
              )}
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading} color="blue">
                {editingSubject ? "Update" : "Add"} Subject
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Confirm Delete"
        centered
      >
        <Stack gap="md">
          <Alert color="red" title="Warning" variant="light" icon={<IconTrash size={16} />}>
            <Text size="sm">
              Are you sure you want to delete "{confirmDelete?.name}"? This action cannot be undone.
            </Text>
          </Alert>
          
          <Text size="sm" c="dimmed">
            If this subject is being used in class offerings or teaching assignments, those will need to be updated first.
          </Text>

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={handleDelete}
              loading={loading}
            >
              Delete Subject
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}; 