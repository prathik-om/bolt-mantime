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
  Badge,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client'

export interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  academic_year_id: string;
}

interface TermsClientUIProps {
  initialTerms: Term[];
  schoolId: string;
}

const TermsClientUI: React.FC<TermsClientUIProps> = ({ 
  initialTerms, 
  schoolId 
}) => {
  const [terms, setTerms] = useState<Term[]>(initialTerms);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Term | null>(null);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
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
    setEditingTerm(null);
    form.reset();
    setModalOpen(true);
  };

  const openEditModal = (term: Term) => {
    setEditingTerm(term);
    form.setValues({
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      if (editingTerm) {
        // Update
        const { data, error } = await createClient()
          .from("terms")
          .update({
            name: values.name,
            start_date: values.start_date,
            end_date: values.end_date,
          })
          .eq("id", editingTerm.id)
          .select();
        
        if (error) throw error;
        
        // Update local state immediately
        setTerms(prevTerms => 
          prevTerms.map(term => 
            term.id === editingTerm.id 
              ? { ...term, ...values }
              : term
          )
        );
        
        toast.success("Term updated!");
      } else {
        // Insert - we need to get the academic year ID first
        const { data: academicYears, error: academicYearError } = await createClient()
          .from("academic_years")
          .select("id")
          .eq("school_id", schoolId)
          .limit(1);

        if (academicYearError) throw academicYearError;
        
        if (!academicYears || academicYears.length === 0) {
          throw new Error("No academic year found for this school. Please create an academic year first.");
        }

        const insertData = {
          name: values.name,
          start_date: values.start_date,
          end_date: values.end_date,
          academic_year_id: academicYears[0].id,
        };
        
        const { data, error } = await createClient()
          .from("terms")
          .insert(insertData)
          .select();
        
        if (error) throw error;
        
        // Add new term to local state immediately
        if (data && data[0]) {
          setTerms(prevTerms => [...prevTerms, data[0]]);
        }
        
        toast.success("Term added!");
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
      const { data, error } = await createClient()
        .from("terms")
        .delete()
        .eq("id", confirmDelete.id)
        .select();
      
      if (error) throw error;
      
      // Remove term from local state immediately
      setTerms(prevTerms => 
        prevTerms.filter(term => term.id !== confirmDelete.id)
      );
      
      toast.success("Term deleted!");
      setConfirmDelete(null);
      router.refresh();
    } catch (err: any) {
      console.error('Error in handleDelete:', err);
      toast.error(err.message || "Failed to delete term");
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
        <h2>Terms</h2>
        <Button leftSection={<IconPlus size={18} />} onClick={openAddModal}>
          Add New Term
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
          {terms.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={4} align="center">
                No terms found.
              </Table.Td>
            </Table.Tr>
          ) : (
            terms.map((term) => (
              <Table.Tr key={term.id}>
                <Table.Td>{term.name}</Table.Td>
                <Table.Td>{formatDate(term.start_date)}</Table.Td>
                <Table.Td>{formatDate(term.end_date)}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => openEditModal(term)}
                        aria-label="Edit"
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => setConfirmDelete(term)}
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
        title={editingTerm ? "Edit Term" : "Add New Term"}
        centered
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Term Name"
              placeholder="e.g. First Term, Second Term"
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
                {editingTerm ? "Update" : "Add"} Term
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
          <Text>
            Are you sure you want to delete the term "{confirmDelete?.name}"? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={loading}>
              Delete Term
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
};

export default TermsClientUI; 