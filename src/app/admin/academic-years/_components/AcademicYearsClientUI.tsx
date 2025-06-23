"use client";

import React, { useState } from "react";
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
  Switch,
  Badge,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client'
import type { Database } from "@/types/database";

type AcademicYear = Database['public']['Tables']['academic_years']['Row'];

interface AcademicYearsClientUIProps {
  initialAcademicYears: AcademicYear[];
  schoolId: string;
}

const AcademicYearsClientUI: React.FC<AcademicYearsClientUIProps> = ({ 
  initialAcademicYears, 
  schoolId 
}) => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(initialAcademicYears);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AcademicYear | null>(null);
  const [editingAcademicYear, setEditingAcademicYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm({
    initialValues: {
      name: "",
      start_date: "",
      end_date: "",
    },
    validate: {
      name: (value) => (value.length < 2 ? "Name must be at least 2 characters" : null),
      start_date: (value) => (!value ? "Start date is required" : null),
      end_date: (value) => (!value ? "End date is required" : null),
    },
  });

  const openAddModal = () => {
    setEditingAcademicYear(null);
    form.reset();
    setModalOpen(true);
  };

  const openEditModal = (academicYear: AcademicYear) => {
    setEditingAcademicYear(academicYear);
    form.setValues({
      name: academicYear.name,
      start_date: academicYear.start_date,
      end_date: academicYear.end_date,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      if (editingAcademicYear) {
        // Update
        const { data, error } = await createClient()
          .from("academic_years")
          .update({
            name: values.name,
            start_date: values.start_date,
            end_date: values.end_date,
          })
          .eq("id", editingAcademicYear.id)
          .select();
        
        if (error) throw error;
        
        // Update local state immediately
        setAcademicYears(prevYears => 
          prevYears.map(year => 
            year.id === editingAcademicYear.id 
              ? { ...year, ...values }
              : year
          )
        );
        
        toast.success("Academic year updated!");
      } else {
        // Insert
        const insertData = {
          name: values.name,
          start_date: values.start_date,
          end_date: values.end_date,
          school_id: schoolId,
        };
        
        const { data, error } = await createClient()
          .from("academic_years")
          .insert(insertData)
          .select();
        
        if (error) throw error;
        
        // Add new academic year to local state immediately
        if (data && data[0]) {
          setAcademicYears(prevYears => [...prevYears, data[0]]);
        }
        
        toast.success("Academic year added!");
      }
      setModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      console.log('Deleting academic year with ID:', confirmDelete.id);
      const { data, error } = await createClient()
        .from("academic_years")
        .delete()
        .eq("id", confirmDelete.id)
        .select();
      
      console.log('Delete result:', { data, error });
      if (error) throw error;
      
      // Remove academic year from local state immediately
      setAcademicYears(prevYears => 
        prevYears.filter(year => year.id !== confirmDelete.id)
      );
      
      toast.success("Academic year deleted!");
      setConfirmDelete(null);
      // Keep router.refresh() as a fallback for server-side data consistency
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleDelete:', err);
      toast.error(err.message || "Failed to delete academic year");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <h2>Academic Years</h2>
        <Button leftSection={<IconPlus size={18} />} onClick={openAddModal}>
          Add New Academic Year
        </Button>
      </Group>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Start Date</Table.Th>
            <Table.Th>End Date</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {academicYears.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={4} align="center">
                No academic years found.
              </Table.Td>
            </Table.Tr>
          ) : (
            academicYears.map((academicYear) => (
              <Table.Tr key={academicYear.id}>
                <Table.Td>{academicYear.name}</Table.Td>
                <Table.Td>{formatDate(academicYear.start_date)}</Table.Td>
                <Table.Td>{formatDate(academicYear.end_date)}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => openEditModal(academicYear)}
                        aria-label="Edit"
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => setConfirmDelete(academicYear)}
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

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAcademicYear ? "Edit Academic Year" : "Add New Academic Year"}
        centered
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Academic Year Name"
              placeholder="e.g. 2024-2025"
              {...form.getInputProps("name")}
              required
            />
            <TextInput
              label="Start Date"
              type="date"
              {...form.getInputProps("start_date")}
              required
            />
            <TextInput
              label="End Date"
              type="date"
              {...form.getInputProps("end_date")}
              required
            />
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {editingAcademicYear ? "Update" : "Add"} Academic Year
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
        <Stack>
          <p>
            Are you sure you want to delete "{confirmDelete?.name}"? This action cannot be undone.
          </p>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={loading}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
};

export default AcademicYearsClientUI; 