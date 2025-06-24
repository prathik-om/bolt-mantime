"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  TextInput,
  Group,
  Stack,
  ActionIcon,
  Tooltip,
  Select,
  Text,
  NumberInput,
  Switch,
  Badge,
  ScrollArea,
  Paper,
  Checkbox,
  Grid,
  Title,
  Container,
  Alert,
  MultiSelect,
  Loader,
  Box,
  Divider,
  List,
  ListItem,
  Textarea,
  ThemeIcon,
  RingProgress,
  Progress,
  Timeline,
  TimelineItem,
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
  Slider,
  ColorInput,
  FileInput,
  PasswordInput,
  SegmentedControl,
  PinInput,
  Rating,
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
  IconBook
} from "@tabler/icons-react";
import { notifications } from '@mantine/notifications';
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client';
import type { Database } from "@/types/database";
import { getDepartmentsForSelect } from "@/lib/api/departments";
import { 
  getTeachersWithDepartments, 
  bulkAssignTeacherToDepartments,
  getTeacherQualifications,
  type TeacherWithDepartments 
} from "@/lib/api/teacher-departments";

// Types based on new schema
export type Teacher = Database['public']['Tables']['teachers']['Row'];

interface TeachersClientUIProps {
  initialTeachers: Teacher[];
  schoolId: string;
}

const TeachersClientUI: React.FC<TeachersClientUIProps> = ({ 
  initialTeachers, 
  schoolId 
}) => {
  const [teachers, setTeachers] = useState<TeacherWithDepartments[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TeacherWithDepartments | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithDepartments | null>(null);
  const [viewTeacher, setViewTeacher] = useState<TeacherWithDepartments | null>(null);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<{ value: string; label: string }[]>([]);
  const [teacherQualifications, setTeacherQualifications] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Load departments for selection
  useEffect(() => {
    getDepartmentsForSelect(schoolId).then(setDepartments).catch(() => setDepartments([]));
  }, [schoolId]);

  // Load teachers with departments
  useEffect(() => {
    setLoading(true);
    getTeachersWithDepartments(schoolId)
      .then(setTeachers)
      .catch(() => setTeachers(initialTeachers.map(t => ({ ...t, teacher_departments: [] }))))
      .finally(() => setLoading(false));
  }, [schoolId, initialTeachers]);

  const form = useForm({
    initialValues: {
      first_name: "",
      last_name: "",
      email: "",
      max_periods_per_week: 20,
      department_ids: [] as string[],
      primary_department_id: "" as string | null,
    },
    validate: {
      first_name: (value) => (!value ? "First name is required" : null),
      last_name: (value) => (!value ? "Last name is required" : null),
      email: (value) => (!value ? "Email is required" : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? "Invalid email" : null),
      max_periods_per_week: (value) => (value && (value < 1 || value > 40) ? "Must be between 1 and 40" : null),
      department_ids: (value) => (value.length === 0 ? "At least one department must be selected" : null),
    },
  });

  // Simple function to get teachers
  const getTeachers = async (schoolId: string): Promise<Teacher[]> => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('school_id', schoolId)
      .order('first_name');
    
    if (error) throw error;
    return data || [];
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    form.reset();
    setModalOpen(true);
  };

  const openEditModal = (teacher: TeacherWithDepartments) => {
    setEditingTeacher(teacher);
    const departmentIds = teacher.teacher_departments?.map(td => td.department_id) || [];
    const primaryDept = teacher.teacher_departments?.find(td => td.is_primary)?.department_id;
    form.setValues({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      max_periods_per_week: teacher.max_periods_per_week || 20,
      department_ids: departmentIds,
      primary_department_id: primaryDept || null,
    });
    setModalOpen(true);
  };

  const openViewModal = async (teacher: TeacherWithDepartments) => {
    setViewTeacher(teacher);
    try {
      const qualifications = await getTeacherQualifications(teacher.id);
      setTeacherQualifications(qualifications);
    } catch {
      setTeacherQualifications([]);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    setFormLoading(true);
    try {
      const teacherData = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        school_id: schoolId,
        max_periods_per_week: values.max_periods_per_week,
      };
      if (editingTeacher) {
        // Update teacher
        await supabase.from("teachers").update(teacherData).eq("id", editingTeacher.id);
        await bulkAssignTeacherToDepartments(
          editingTeacher.id,
          values.department_ids,
          values.primary_department_id || undefined
        );
        notifications.show({ title: 'Success', message: 'Teacher updated successfully', color: 'green' });
      } else {
        // Insert new teacher
        const { data, error } = await supabase.from("teachers").insert(teacherData).select();
        if (error) throw error;
        const newTeacher = data[0];
        await bulkAssignTeacherToDepartments(
          newTeacher.id,
          values.department_ids,
          values.primary_department_id || undefined
        );
        notifications.show({ title: 'Success', message: 'Teacher added successfully', color: 'green' });
      }
      setModalOpen(false);
      // Refresh teachers list
      setLoading(true);
      getTeachersWithDepartments(schoolId).then(setTeachers).finally(() => setLoading(false));
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message || "Something went wrong", color: 'red' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      await supabase.from("teachers").delete().eq("id", confirmDelete.id);
      setTeachers(prev => prev.filter(t => t.id !== confirmDelete.id));
      notifications.show({ title: 'Success', message: 'Teacher deleted successfully', color: 'green' });
      setConfirmDelete(null);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message || "Failed to delete teacher", color: 'red' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Container size="xl" py="md">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={2}>Teachers</Title>
            <Text c="dimmed" size="sm">
              Manage teaching staff, their department assignments, and qualifications
            </Text>
          </div>
          <Button leftSection={<IconPlus size={18} />} onClick={openAddModal}>
            Add New Teacher
          </Button>
        </Group>

        <ScrollArea h={400} type="auto">
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Departments</Table.Th>
                <Table.Th>Max Periods/Week</Table.Th>
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
                            {td.is_primary && " (Primary)"}
                          </Badge>
                        )) || <Text size="sm" c="dimmed">No departments assigned</Text>}
                      </Group>
                    </Table.Td>
                    <Table.Td>{teacher.max_periods_per_week || 'Not set'}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View Details">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => openViewModal(teacher)}
                            aria-label="View details"
                          >
                            <IconEye size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => openEditModal(teacher)}
                            aria-label="Edit"
                          >
                            <IconEdit size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => setConfirmDelete(teacher)}
                            aria-label="Delete"
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {/* Add/Edit Modal */}
        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingTeacher ? "Edit Teacher" : "Add New Teacher"}
          size="lg"
          centered
        >
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <Group grow>
                <TextInput
                  label="First Name"
                  placeholder="Enter first name"
                  {...form.getInputProps("first_name")}
                  required
                />
                <TextInput
                  label="Last Name"
                  placeholder="Enter last name"
                  {...form.getInputProps("last_name")}
                  required
                />
              </Group>
              <TextInput
                label="Email"
                type="email"
                placeholder="Enter email address"
                {...form.getInputProps("email")}
                required
              />
              <NumberInput
                label="Max Periods per Week"
                placeholder="Enter maximum periods per week"
                min={1}
                max={40}
                {...form.getInputProps("max_periods_per_week")}
              />
              <MultiSelect
                label="Departments"
                placeholder="Select departments"
                data={departments}
                {...form.getInputProps("department_ids")}
                required
                searchable
                clearable
              />
              <Select
                label="Primary Department"
                placeholder="Select primary department"
                data={departments.filter(dept => form.values.department_ids.includes(dept.value))}
                {...form.getInputProps("primary_department_id")}
                clearable
              />
              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={() => setModalOpen(false)} disabled={formLoading}>
                  Cancel
                </Button>
                <Button type="submit" loading={formLoading}>
                  {editingTeacher ? "Update Teacher" : "Add Teacher"}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* View Teacher Modal */}
        <Modal
          opened={!!viewTeacher}
          onClose={() => setViewTeacher(null)}
          title={viewTeacher ? `Teacher Details - ${viewTeacher.first_name} ${viewTeacher.last_name}` : "Teacher Details"}
          size="lg"
          centered
        >
          {viewTeacher && (
            <Stack gap="md">
              <Group>
                <div>
                  <Text size="sm" fw={500}>Email</Text>
                  <Text size="sm" c="dimmed">{viewTeacher.email}</Text>
                </div>
                <div>
                  <Text size="sm" fw={500}>Max Periods/Week</Text>
                  <Text size="sm" c="dimmed">{viewTeacher.max_periods_per_week || 'Not set'}</Text>
                </div>
              </Group>
              <Divider />
              <div>
                <Text size="sm" fw={500} mb="xs">Department Assignments</Text>
                <Group gap="xs">
                  {viewTeacher.teacher_departments?.map((td) => (
                    <Badge 
                      key={td.id} 
                      color={td.is_primary ? "blue" : "gray"}
                      variant={td.is_primary ? "filled" : "light"}
                    >
                      {td.department.name}
                      {td.is_primary && " (Primary)"}
                    </Badge>
                  )) || <Text size="sm" c="dimmed">No departments assigned</Text>}
                </Group>
              </div>
              <Divider />
              <div>
                <Text size="sm" fw={500} mb="xs">Qualifications (Courses they can teach)</Text>
                {teacherQualifications.length > 0 ? (
                  <ScrollArea h={200} type="auto">
                    <Stack gap="xs">
                      {teacherQualifications.map((qual, index) => (
                        <Paper key={index} p="xs" withBorder>
                          <Group justify="space-between">
                            <div>
                              <Text size="sm" fw={500}>{qual.course_name}</Text>
                              <Text size="xs" c="dimmed">
                                {qual.department_name} • Grade {qual.grade_level}
                                {qual.course_code && ` • ${qual.course_code}`}
                              </Text>
                            </div>
                            {qual.is_primary_department && (
                              <Badge size="xs" color="blue">Primary</Badge>
                            )}
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea>
                ) : (
                  <Text size="sm" c="dimmed">No qualifications found</Text>
                )}
              </div>
            </Stack>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          title="Confirm Delete"
          size="sm"
          centered
        >
          <Stack>
            <Text>
              Are you sure you want to delete "{confirmDelete?.first_name} {confirmDelete?.last_name}"? This action cannot be undone.
            </Text>
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setConfirmDelete(null)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button color="red" onClick={handleDelete} loading={deleteLoading}>
                Delete
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Card>
    </Container>
  );
};

export default TeachersClientUI; 