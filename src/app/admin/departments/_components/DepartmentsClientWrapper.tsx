"use client";

import React, { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Alert,
  Card,
  Group,
  Button,
  Badge,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
  Textarea,
} from "@mantine/core";
import { 
  IconBuilding, 
  IconUsers, 
  IconBook, 
  IconPlus, 
  IconEdit, 
  IconTrash,
  IconSchool
} from "@tabler/icons-react";
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createDepartment, updateDepartment, deleteDepartment, checkDepartmentNameExists } from "@/lib/api/departments";
import type { Database } from "@/types/database";
import Link from "next/link";

type Department = Database['public']['Tables']['departments']['Row'];

export interface DepartmentWithStats extends Department {
  teacher_count: number;
  course_count: number;
}

interface DepartmentsClientWrapperProps {
  departments: DepartmentWithStats[];
  schoolId: string;
  totalTeachers: number;
  totalCourses: number;
}

const DepartmentsClientWrapper: React.FC<DepartmentsClientWrapperProps> = ({
  departments,
  schoolId,
  totalTeachers,
  totalCourses,
}) => {
  const [departmentsList, setDepartmentsList] = useState<DepartmentWithStats[]>(departments);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithStats | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState<DepartmentWithStats | null>(null);

  const form = useForm({
    initialValues: {
      name: '',
      code: '',
      description: '',
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? 'Name must be at least 2 characters' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingDepartment) {
        // Check if name already exists (excluding current department)
        const nameExists = await checkDepartmentNameExists(values.name, schoolId, editingDepartment.id);
        if (nameExists) {
          notifications.show({
            title: 'Error',
            message: 'A department with this name already exists',
            color: 'red',
          });
          return;
        }

        const updatedDepartment = await updateDepartment(editingDepartment.id, {
          name: values.name.trim(),
          code: values.code.trim() || null,
          description: values.description.trim() || null,
        });

        setDepartmentsList(prev => 
          prev.map(dept => 
            dept.id === editingDepartment.id 
              ? { ...dept, ...updatedDepartment }
              : dept
          )
        );

        notifications.show({
          title: 'Success',
          message: 'Department updated successfully',
          color: 'green',
        });
      } else {
        // Check if name already exists
        const nameExists = await checkDepartmentNameExists(values.name, schoolId);
        if (nameExists) {
          notifications.show({
            title: 'Error',
            message: 'A department with this name already exists',
            color: 'red',
          });
          return;
        }

        const newDepartment = await createDepartment({
          name: values.name.trim(),
          code: values.code.trim() || null,
          description: values.description.trim() || null,
          school_id: schoolId,
        });

        setDepartmentsList(prev => [
          ...prev,
          { ...newDepartment, teacher_count: 0, course_count: 0 }
        ]);

        notifications.show({
          title: 'Success',
          message: 'Department created successfully',
          color: 'green',
        });
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving department:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save department',
        color: 'red',
      });
    }
  };

  const handleEdit = (department: DepartmentWithStats) => {
    setEditingDepartment(department);
    form.setValues({
      name: department.name,
      code: department.code || '',
      description: department.description || '',
    });
    setModalOpened(true);
  };

  const handleDelete = (department: DepartmentWithStats) => {
    setDeletingDepartment(department);
    setDeleteModalOpened(true);
  };

  const confirmDelete = async () => {
    if (!deletingDepartment) return;

    try {
      await deleteDepartment(deletingDepartment.id);
      setDepartmentsList(prev => prev.filter(dept => dept.id !== deletingDepartment.id));
      
      notifications.show({
        title: 'Success',
        message: 'Department deleted successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error deleting department:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete department',
        color: 'red',
      });
    } finally {
      setDeleteModalOpened(false);
      setDeletingDepartment(null);
    }
  };

  const handleCloseModal = () => {
    setModalOpened(false);
    setEditingDepartment(null);
    form.reset();
  };

  const handleAddNew = () => {
    setEditingDepartment(null);
    form.reset();
    setModalOpened(true);
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={1}>Departments</Title>
          <Text c="dimmed" mt="xs">
            Manage academic departments for your school.
          </Text>
        </div>

        {/* Stats Cards */}
        <Group grow>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconBuilding size={24} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="lg" fw={700}>{departmentsList.length}</Text>
                <Text size="sm" c="dimmed">Total Departments</Text>
              </div>
            </Group>
          </Card>
          
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconUsers size={24} color="var(--mantine-color-green-6)" />
              <div>
                <Text size="lg" fw={700}>{totalTeachers}</Text>
                <Text size="sm" c="dimmed">Total Teachers</Text>
              </div>
            </Group>
          </Card>
          
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <IconBook size={24} color="var(--mantine-color-orange-6)" />
              <div>
                <Text size="lg" fw={700}>{totalCourses}</Text>
                <Text size="sm" c="dimmed">Total Subjects</Text>
              </div>
            </Group>
          </Card>
        </Group>

        {/* Departments Management */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3}>Department Management</Title>
              <Text size="sm" c="dimmed">Create and manage academic departments</Text>
            </div>
            <Button 
              leftSection={<IconPlus size={16} />}
              onClick={handleAddNew}
            >
              Add Department
            </Button>
          </Group>

          {departmentsList.length === 0 ? (
            <Alert color="blue" title="No Departments">
              No departments configured yet. Click "Add Department" to get started.
            </Alert>
          ) : (
            <Stack gap="sm">
              {departmentsList.map((department) => (
                <Card key={department.id} shadow="xs" padding="md" radius="md" withBorder>
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs" mb="xs">
                        <Text fw={500}>{department.name}</Text>
                        {department.code && (
                          <Badge color="blue" variant="light" size="sm">
                            {department.code}
                          </Badge>
                        )}
                      </Group>
                      {department.description && (
                        <Text size="sm" c="dimmed" mb="xs">
                          {department.description}
                        </Text>
                      )}
                      <Group gap="lg">
                        <Text size="sm" c="dimmed">
                          <IconUsers size={14} style={{ display: 'inline', marginRight: '4px' }} />
                          {department.teacher_count} teachers
                        </Text>
                        <Text size="sm" c="dimmed">
                          <IconBook size={14} style={{ display: 'inline', marginRight: '4px' }} />
                          {department.course_count} subjects
                        </Text>
                      </Group>
                    </div>
                    <Group gap="xs">
                      <Tooltip label="Edit Department">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleEdit(department)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete Department">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(department)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Card>

        {/* Quick Actions */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Quick Actions</Title>
          <Group>
            <Button 
              variant="light" 
              leftSection={<IconUsers size={16} />}
              component="a"
              href="/admin/teachers"
            >
              Manage Teachers
            </Button>
            <Button 
              variant="light" 
              leftSection={<IconBook size={16} />}
              component={Link}
              href="/admin/subjects"
            >
              Manage Subjects
            </Button>
            <Button 
              variant="light" 
              leftSection={<IconSchool size={16} />}
              component="a"
              href="/admin/classes"
            >
              Manage Classes
            </Button>
          </Group>
        </Card>
      </Stack>

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={handleCloseModal}
        title={editingDepartment ? "Edit Department" : "Add New Department"}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Department Name"
              placeholder="Enter department name"
              required
              {...form.getInputProps('name')}
            />
            
            <TextInput
              label="Department Code"
              placeholder="Enter department code (optional)"
              {...form.getInputProps('code')}
            />
            
            <Textarea
              label="Description"
              placeholder="Enter department description (optional)"
              rows={3}
              {...form.getInputProps('description')}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingDepartment ? "Update Department" : "Create Department"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title="Delete Department"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete the department "{deletingDepartment?.name}"? 
            This action cannot be undone.
          </Text>
          
          {deletingDepartment && (deletingDepartment.teacher_count > 0 || deletingDepartment.course_count > 0) && (
            <Alert color="orange" title="Warning">
              This department has {deletingDepartment.teacher_count} teachers and {deletingDepartment.course_count} subjects assigned to it. 
              Deleting it may affect related data.
            </Alert>
          )}
          
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setDeleteModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmDelete}>
              Delete Department
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default DepartmentsClientWrapper; 