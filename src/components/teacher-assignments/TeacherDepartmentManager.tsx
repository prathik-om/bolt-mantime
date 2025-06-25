"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Group,
  Stack,
  ActionIcon,
  Tooltip,
  Select,
  Text,
  Badge,
  ScrollArea,
  Paper,
  Checkbox,
  Title,
  Container,
  Alert,
  MultiSelect,
  Loader,
  Box,
  Divider,
  List,
  ListItem,
  ThemeIcon,
  RingProgress,
  Progress,
  Accordion,
  AccordionItem,
  AccordionControl,
  AccordionPanel,
  AccordionChevron,
  Tabs,
  TabsList,
  TabsTab,
  TabsPanel,
  Breadcrumbs,
  Anchor,
  Pagination,
  SegmentedControl,
  NativeSelect,
  Autocomplete,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconEye, 
  IconSchool, 
  IconBuilding,
  IconUsers,
  IconBook,
  IconChartBar,
  IconUserCheck,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconUserPlus,
  IconUserMinus,
  IconStar,
  IconStarOff
} from "@tabler/icons-react";
import { notifications } from '@mantine/notifications';
import { createClient } from '@/utils/supabase/client';
import type { Database } from "@/types/database";
import { 
  getTeachersWithDepartments,
  getDepartmentsWithTeachers,
  assignTeacherToDepartment,
  removeTeacherFromDepartment,
  updateTeacherDepartment,
  bulkAssignTeacherToDepartments,
  getTeachersByDepartment,
  validateTeacherDepartmentAssignment,
  type TeacherWithDepartments,
  type DepartmentWithTeachers
} from "@/lib/api/teacher-departments";

type Teacher = Database['public']['Tables']['teachers']['Row'];
type Department = Database['public']['Tables']['departments']['Row'];

interface TeacherDepartmentManagerProps {
  schoolId: string;
  mode: 'teacher-focused' | 'department-focused';
  selectedTeacherId?: string;
  selectedDepartmentId?: string;
  onUpdate?: () => void;
}

const TeacherDepartmentManager: React.FC<TeacherDepartmentManagerProps> = ({
  schoolId,
  mode,
  selectedTeacherId,
  selectedDepartmentId,
  onUpdate
}) => {
  const [teachers, setTeachers] = useState<TeacherWithDepartments[]>([]);
  const [departments, setDepartments] = useState<DepartmentWithTeachers[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('assignments');
  const supabase = createClient();

  const assignForm = useForm({
    initialValues: {
      teacher_id: '',
      department_id: '',
      is_primary: false,
    },
    validate: {
      teacher_id: (value) => (!value ? "Teacher is required" : null),
      department_id: (value) => (!value ? "Department is required" : null),
    },
  });

  const bulkAssignForm = useForm({
    initialValues: {
      teacher_ids: [] as string[],
      department_ids: [] as string[],
      primary_department_id: '' as string | null,
    },
    validate: {
      teacher_ids: (value) => (value.length === 0 ? "At least one teacher must be selected" : null),
      department_ids: (value) => (value.length === 0 ? "At least one department must be selected" : null),
    },
  });

  // Load data based on mode
  useEffect(() => {
    setLoading(true);
    const loadData = async () => {
      try {
        if (mode === 'teacher-focused') {
          const teachersData = await getTeachersWithDepartments(schoolId);
          setTeachers(teachersData);
          
          // Get available departments for assignment
          const { data: depts } = await supabase
            .from('departments')
            .select('*')
            .eq('school_id', schoolId)
            .order('name');
          setAvailableDepartments(depts || []);
        } else {
          const departmentsData = await getDepartmentsWithTeachers(schoolId);
          setDepartments(departmentsData);
          
          // Get available teachers for assignment
          const { data: teachers } = await supabase
            .from('teachers')
            .select('*')
            .eq('school_id', schoolId)
            .order('first_name');
          setAvailableTeachers(teachers || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to load data',
          color: 'red'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [schoolId, mode, supabase]);

  const handleAssignTeacher = async (values: typeof assignForm.values) => {
    setFormLoading(true);
    try {
      await assignTeacherToDepartment(
        values.teacher_id,
        values.department_id,
        values.is_primary
      );
      
      notifications.show({
        title: 'Success',
        message: 'Teacher assigned to department successfully',
        color: 'green'
      });
      
      setAssignModalOpen(false);
      assignForm.reset();
      onUpdate?.();
      
      // Refresh data
      if (mode === 'teacher-focused') {
        const teachersData = await getTeachersWithDepartments(schoolId);
        setTeachers(teachersData);
      } else {
        const departmentsData = await getDepartmentsWithTeachers(schoolId);
        setDepartments(departmentsData);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to assign teacher',
        color: 'red'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleBulkAssign = async (values: typeof bulkAssignForm.values) => {
    setFormLoading(true);
    try {
      for (const teacherId of values.teacher_ids) {
        await bulkAssignTeacherToDepartments(
          teacherId,
          values.department_ids,
          values.primary_department_id || undefined
        );
      }
      
      notifications.show({
        title: 'Success',
        message: 'Teachers assigned to departments successfully',
        color: 'green'
      });
      
      setBulkAssignModalOpen(false);
      bulkAssignForm.reset();
      onUpdate?.();
      
      // Refresh data
      if (mode === 'teacher-focused') {
        const teachersData = await getTeachersWithDepartments(schoolId);
        setTeachers(teachersData);
      } else {
        const departmentsData = await getDepartmentsWithTeachers(schoolId);
        setDepartments(departmentsData);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to assign teachers',
        color: 'red'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveAssignment = async (teacherId: string, departmentId: string) => {
    try {
      await removeTeacherFromDepartment(teacherId, departmentId);
      
      notifications.show({
        title: 'Success',
        message: 'Teacher removed from department successfully',
        color: 'green'
      });
      
      onUpdate?.();
      
      // Refresh data
      if (mode === 'teacher-focused') {
        const teachersData = await getTeachersWithDepartments(schoolId);
        setTeachers(teachersData);
      } else {
        const departmentsData = await getDepartmentsWithTeachers(schoolId);
        setDepartments(departmentsData);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to remove assignment',
        color: 'red'
      });
    }
  };

  const handleTogglePrimary = async (teacherId: string, departmentId: string, isPrimary: boolean) => {
    try {
      await updateTeacherDepartment(teacherId, departmentId, { is_primary: !isPrimary });
      
      notifications.show({
        title: 'Success',
        message: `Department ${!isPrimary ? 'set as' : 'removed from'} primary`,
        color: 'green'
      });
      
      onUpdate?.();
      
      // Refresh data
      if (mode === 'teacher-focused') {
        const teachersData = await getTeachersWithDepartments(schoolId);
        setTeachers(teachersData);
      } else {
        const departmentsData = await getDepartmentsWithTeachers(schoolId);
        setDepartments(departmentsData);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update primary status',
        color: 'red'
      });
    }
  };

  const renderTeacherFocusedView = () => (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <TabsList>
        <TabsTab value="assignments" leftSection={<IconUsers size={16} />}>
          Department Assignments
        </TabsTab>
        <TabsTab value="bulk" leftSection={<IconUserPlus size={16} />}>
          Bulk Assignment
        </TabsTab>
      </TabsList>

      <TabsPanel value="assignments" pt="xs">
        <Group justify="space-between" mb="md">
          <Title order={3}>Teacher Department Assignments</Title>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => setAssignModalOpen(true)}
          >
            Assign Teacher to Department
          </Button>
        </Group>

        <ScrollArea h={400} type="auto">
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Teacher</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Departments</Table.Th>
                <Table.Th>Primary Department</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={5} align="center">
                    <Loader size="sm" />
                  </Table.Td>
                </Table.Tr>
              ) : teachers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} align="center">
                    No teachers found.
                  </Table.Td>
                </Table.Tr>
              ) : (
                teachers.map((teacher) => (
                  <Table.Tr key={teacher.id}>
                    <Table.Td>
                      <Text fw={500}>
                        {teacher.first_name} {teacher.last_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>{teacher.email}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {teacher.teacher_departments?.map((td) => (
                          <Badge 
                            key={td.id} 
                            color={td.is_primary ? "blue" : "gray"}
                            variant={td.is_primary ? "filled" : "light"}
                          >
                            {td.department.name}
                          </Badge>
                        )) || <Text size="sm" c="dimmed">No departments assigned</Text>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {teacher.teacher_departments?.find(td => td.is_primary)?.department.name || 
                       <Text size="sm" c="dimmed">None</Text>}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {teacher.teacher_departments?.map((td) => (
                          <Group key={td.id} gap="xs">
                            <Tooltip label={td.is_primary ? "Remove from primary" : "Set as primary"}>
                              <ActionIcon
                                variant="light"
                                color={td.is_primary ? "blue" : "gray"}
                                onClick={() => handleTogglePrimary(teacher.id, td.department_id, td.is_primary || false)}
                                aria-label={td.is_primary ? "Remove from primary" : "Set as primary"}
                              >
                                {td.is_primary ? <IconStar size={16} /> : <IconStarOff size={16} />}
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Remove from department">
                              <ActionIcon
                                variant="light"
                                color="red"
                                onClick={() => handleRemoveAssignment(teacher.id, td.department_id)}
                                aria-label="Remove from department"
                              >
                                <IconUserMinus size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        ))}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </TabsPanel>

      <TabsPanel value="bulk" pt="xs">
        <Group justify="space-between" mb="md">
          <Title order={3}>Bulk Teacher Assignment</Title>
          <Button 
            leftSection={<IconUserPlus size={16} />} 
            onClick={() => setBulkAssignModalOpen(true)}
          >
            Bulk Assign Teachers
          </Button>
        </Group>

        <Alert icon={<IconAlertTriangle size={16} />} color="blue" title="Bulk Assignment">
          Use this feature to assign multiple teachers to multiple departments at once. 
          You can specify a primary department for each teacher.
        </Alert>
      </TabsPanel>
    </Tabs>
  );

  const renderDepartmentFocusedView = () => (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <TabsList>
        <TabsTab value="assignments" leftSection={<IconBuilding size={16} />}>
          Teacher Assignments
        </TabsTab>
        <TabsTab value="bulk" leftSection={<IconUserPlus size={16} />}>
          Bulk Assignment
        </TabsTab>
      </TabsList>

      <TabsPanel value="assignments" pt="xs">
        <Group justify="space-between" mb="md">
          <Title order={3}>Department Teacher Assignments</Title>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => setAssignModalOpen(true)}
          >
            Assign Teacher to Department
          </Button>
        </Group>

        <ScrollArea h={400} type="auto">
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Department</Table.Th>
                <Table.Th>Code</Table.Th>
                <Table.Th>Teachers</Table.Th>
                <Table.Th>Primary Teachers</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={5} align="center">
                    <Loader size="sm" />
                  </Table.Td>
                </Table.Tr>
              ) : departments.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} align="center">
                    No departments found.
                  </Table.Td>
                </Table.Tr>
              ) : (
                departments.map((department) => (
                  <Table.Tr key={department.id}>
                    <Table.Td>
                      <Text fw={500}>{department.name}</Text>
                    </Table.Td>
                    <Table.Td>{department.code || '-'}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {department.teacher_departments?.map((td) => (
                          <Badge 
                            key={td.id} 
                            color={td.is_primary ? "blue" : "gray"}
                            variant={td.is_primary ? "filled" : "light"}
                          >
                            {td.teacher.first_name} {td.teacher.last_name}
                          </Badge>
                        )) || <Text size="sm" c="dimmed">No teachers assigned</Text>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {department.teacher_departments?.filter(td => td.is_primary).map(td => 
                        `${td.teacher.first_name} ${td.teacher.last_name}`
                      ).join(', ') || <Text size="sm" c="dimmed">None</Text>}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {department.teacher_departments?.map((td) => (
                          <Group key={td.id} gap="xs">
                            <Tooltip label={td.is_primary ? "Remove from primary" : "Set as primary"}>
                              <ActionIcon
                                variant="light"
                                color={td.is_primary ? "blue" : "gray"}
                                onClick={() => handleTogglePrimary(td.teacher_id, department.id, td.is_primary || false)}
                                aria-label={td.is_primary ? "Remove from primary" : "Set as primary"}
                              >
                                {td.is_primary ? <IconStar size={16} /> : <IconStarOff size={16} />}
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Remove from department">
                              <ActionIcon
                                variant="light"
                                color="red"
                                onClick={() => handleRemoveAssignment(td.teacher_id, department.id)}
                                aria-label="Remove from department"
                              >
                                <IconUserMinus size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        ))}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </TabsPanel>

      <TabsPanel value="bulk" pt="xs">
        <Group justify="space-between" mb="md">
          <Title order={3}>Bulk Teacher Assignment</Title>
          <Button 
            leftSection={<IconUserPlus size={16} />} 
            onClick={() => setBulkAssignModalOpen(true)}
          >
            Bulk Assign Teachers
          </Button>
        </Group>

        <Alert icon={<IconAlertTriangle size={16} />} color="blue" title="Bulk Assignment">
          Use this feature to assign multiple teachers to multiple departments at once. 
          You can specify a primary department for each teacher.
        </Alert>
      </TabsPanel>
    </Tabs>
  );

  return (
    <Container size="xl" py="md">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {mode === 'teacher-focused' ? renderTeacherFocusedView() : renderDepartmentFocusedView()}

        {/* Assign Teacher to Department Modal */}
        <Modal
          opened={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Teacher to Department"
          size="md"
          centered
        >
          <form onSubmit={assignForm.onSubmit(handleAssignTeacher)}>
            <Stack>
              <Select
                label="Teacher"
                placeholder="Select a teacher"
                data={availableTeachers.map(t => ({ 
                  value: t.id, 
                  label: `${t.first_name} ${t.last_name}` 
                }))}
                {...assignForm.getInputProps("teacher_id")}
                required
                searchable
              />
              <Select
                label="Department"
                placeholder="Select a department"
                data={availableDepartments.map(d => ({ 
                  value: d.id, 
                  label: d.name 
                }))}
                {...assignForm.getInputProps("department_id")}
                required
                searchable
              />
              <Checkbox
                label="Set as primary department"
                {...assignForm.getInputProps("is_primary", { type: "checkbox" })}
              />
              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={() => setAssignModalOpen(false)} disabled={formLoading}>
                  Cancel
                </Button>
                <Button type="submit" loading={formLoading}>
                  Assign Teacher
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* Bulk Assignment Modal */}
        <Modal
          opened={bulkAssignModalOpen}
          onClose={() => setBulkAssignModalOpen(false)}
          title="Bulk Assign Teachers to Departments"
          size="lg"
          centered
        >
          <form onSubmit={bulkAssignForm.onSubmit(handleBulkAssign)}>
            <Stack>
              <MultiSelect
                label="Teachers"
                placeholder="Select teachers"
                data={availableTeachers.map(t => ({ 
                  value: t.id, 
                  label: `${t.first_name} ${t.last_name}` 
                }))}
                {...bulkAssignForm.getInputProps("teacher_ids")}
                required
                searchable
              />
              <MultiSelect
                label="Departments"
                placeholder="Select departments"
                data={availableDepartments.map(d => ({ 
                  value: d.id, 
                  label: d.name 
                }))}
                {...bulkAssignForm.getInputProps("department_ids")}
                required
                searchable
              />
              <Select
                label="Primary Department (Optional)"
                placeholder="Select primary department"
                data={bulkAssignForm.values.department_ids.map(deptId => {
                  const dept = availableDepartments.find(d => d.id === deptId);
                  return { value: deptId, label: dept?.name || deptId };
                })}
                {...bulkAssignForm.getInputProps("primary_department_id")}
                clearable
              />
              <Alert icon={<IconAlertTriangle size={16} />} color="blue" title="Note">
                Each teacher will be assigned to all selected departments. 
                If a primary department is specified, it will be set as the primary department for all teachers.
              </Alert>
              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={() => setBulkAssignModalOpen(false)} disabled={formLoading}>
                  Cancel
                </Button>
                <Button type="submit" loading={formLoading}>
                  Bulk Assign
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Card>
    </Container>
  );
};

export default TeacherDepartmentManager; 