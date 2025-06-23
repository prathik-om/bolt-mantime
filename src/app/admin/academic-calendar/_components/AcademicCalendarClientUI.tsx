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
  Accordion,
  Text,
  Badge,
  Loader,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { createClient } from '@/utils/supabase/client'
import type { Database } from "@/types/database";

// Types
export type AcademicYearWithTerms = Database['public']['Tables']['academic_years']['Row'] & {
  terms: Database['public']['Tables']['terms']['Row'][];
};

interface AcademicCalendarClientUIProps {
  initialAcademicYears: AcademicYearWithTerms[];
  schoolId: string;
}

const AcademicCalendarClientUI: React.FC<AcademicCalendarClientUIProps> = ({
  initialAcademicYears,
  schoolId,
}) => {
  const [academicYears, setAcademicYears] = useState<AcademicYearWithTerms[]>(initialAcademicYears);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYearWithTerms | null>(null);
  const [editingTerm, setEditingTerm] = useState<{ term: Database['public']['Tables']['terms']['Row'], yearId: string } | null>(null);
  const [confirmDeleteYear, setConfirmDeleteYear] = useState<AcademicYearWithTerms | null>(null);
  const [confirmDeleteTerm, setConfirmDeleteTerm] = useState<{ term: Database['public']['Tables']['terms']['Row'], yearId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeYearId, setActiveYearId] = useState<string | null>(null);

  // Academic Year Form
  const yearForm = useForm({
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

  // Term Form
  const termForm = useForm({
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

  // Open modals
  const openAddYearModal = () => {
    setEditingYear(null);
    yearForm.reset();
    setYearModalOpen(true);
  };
  const openEditYearModal = (year: AcademicYearWithTerms) => {
    setEditingYear(year);
    yearForm.setValues({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
    });
    setYearModalOpen(true);
  };
  const openAddTermModal = (yearId: string) => {
    setEditingTerm({ term: null as any, yearId });
    termForm.reset();
    setTermModalOpen(true);
  };
  const openEditTermModal = (term: Database['public']['Tables']['terms']['Row'], yearId: string) => {
    setEditingTerm({ term, yearId });
    termForm.setValues({
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
    });
    setTermModalOpen(true);
  };

  // CRUD Academic Year
  const handleYearSubmit = async (values: typeof yearForm.values) => {
    setLoading(true);
    try {
      if (editingYear) {
        // Update
        const { data, error } = await createClient()
          .from("academic_years")
          .update({
            name: values.name,
            start_date: values.start_date,
            end_date: values.end_date,
          })
          .eq("id", editingYear.id)
          .select();
        if (error) throw error;
        setAcademicYears((prev) =>
          prev.map((y) => (y.id === editingYear.id ? { ...y, ...values } : y))
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
          .select("*, terms(*)");
        if (error) throw error;
        if (data && data[0]) {
          setAcademicYears((prev) => [data[0], ...prev]);
        }
        toast.success("Academic year added!");
      }
      setYearModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteYear = async () => {
    if (!confirmDeleteYear) return;
    setLoading(true);
    try {
      const { error } = await createClient()
        .from("academic_years")
        .delete()
        .eq("id", confirmDeleteYear.id);
      if (error) throw error;
      setAcademicYears((prev) => prev.filter((y) => y.id !== confirmDeleteYear.id));
      toast.success("Academic year deleted!");
      setConfirmDeleteYear(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete academic year");
    } finally {
      setLoading(false);
    }
  };

  // CRUD Term
  const handleTermSubmit = async (values: typeof termForm.values) => {
    setLoading(true);
    try {
      // Validate dates
      const startDate = new Date(values.start_date);
      const endDate = new Date(values.end_date);
      
      if (endDate <= startDate) {
        throw new Error("End date must be after start date");
      }

      if (editingTerm && editingTerm.term) {
        // Update
        const { data, error } = await createClient()
          .from("terms")
          .update({
            name: values.name,
            start_date: values.start_date,
            end_date: values.end_date,
          })
          .eq("id", editingTerm.term.id)
          .select();
        if (error) {
          if (error.code === '23505') {
            throw new Error("A term with this name already exists in this academic year");
          }
          throw error;
        }
        setAcademicYears((prev) =>
          prev.map((y) =>
            y.id === editingTerm.yearId
              ? {
                  ...y,
                  terms: y.terms.map((t) =>
                    t.id === editingTerm.term.id ? { ...t, ...values } : t
                  ),
                }
              : y
          )
        );
        toast.success("Term updated!");
      } else if (editingTerm) {
        // Check for duplicate term names in the same academic year
        const existingTerms = academicYears
          .find(y => y.id === editingTerm.yearId)
          ?.terms || [];
        
        const duplicateTerm = existingTerms.find(t => 
          t.name.toLowerCase() === values.name.toLowerCase()
        );
        
        if (duplicateTerm) {
          throw new Error("A term with this name already exists in this academic year");
        }

        // Insert
        const insertData = {
          name: values.name,
          start_date: values.start_date,
          end_date: values.end_date,
          academic_year_id: editingTerm.yearId,
        };
        const { data, error } = await createClient()
          .from("terms")
          .insert(insertData)
          .select();
        if (error) {
          if (error.code === '23505') {
            throw new Error("A term with this name already exists in this academic year");
          }
          throw error;
        }
        if (data && data[0]) {
          setAcademicYears((prev) =>
            prev.map((y) =>
              y.id === editingTerm.yearId
                ? { ...y, terms: [data[0], ...y.terms] }
                : y
            )
          );
        }
        toast.success("Term added!");
      }
      setTermModalOpen(false);
    } catch (err: any) {
      console.error('Term operation error:', err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteTerm = async () => {
    if (!confirmDeleteTerm) return;
    setLoading(true);
    try {
      const { error } = await createClient()
        .from("terms")
        .delete()
        .eq("id", confirmDeleteTerm.term.id);
      if (error) throw error;
      setAcademicYears((prev) =>
        prev.map((y) =>
          y.id === confirmDeleteTerm.yearId
            ? { ...y, terms: y.terms.filter((t) => t.id !== confirmDeleteTerm.term.id) }
            : y
        )
      );
      toast.success("Term deleted!");
      setConfirmDeleteTerm(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete term");
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <h2>Academic Calendar</h2>
        <Button leftSection={<IconPlus size={18} />} onClick={openAddYearModal}>
          Add Academic Year
        </Button>
      </Group>
      <Accordion value={activeYearId} onChange={setActiveYearId} multiple={false}>
        {academicYears.length === 0 ? (
          <Accordion.Item value="empty">
            <Accordion.Control>No academic years found.</Accordion.Control>
            <Accordion.Panel>
              <Text c="dimmed">Add an academic year to get started.</Text>
            </Accordion.Panel>
          </Accordion.Item>
        ) : (
          academicYears.map((year) => (
            <Accordion.Item value={year.id} key={year.id}>
              <Accordion.Control>
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text fw={500}>{year.name}</Text>
                    <Text size="xs" c="dimmed">
                      {formatDate(year.start_date)} - {formatDate(year.end_date)}
                    </Text>
                  </Stack>
                  <Group gap="xs">
                    <Tooltip label="Edit Academic Year">
                      <ActionIcon variant="light" color="blue" onClick={(e) => { e.stopPropagation(); openEditYearModal(year); }}>
                        <IconEdit size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete Academic Year">
                      <ActionIcon variant="light" color="red" onClick={(e) => { e.stopPropagation(); setConfirmDeleteYear(year); }}>
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Group justify="space-between" mb="xs">
                  <Text fw={500}>Terms</Text>
                  <Button leftSection={<IconPlus size={16} />} size="xs" onClick={() => openAddTermModal(year.id)}>
                    Add Term
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
                    {year.terms.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={4} align="center">
                          <Text c="dimmed">No terms found for this year.</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      year.terms.map((term) => (
                        <Table.Tr key={term.id}>
                          <Table.Td>{term.name}</Table.Td>
                          <Table.Td>{formatDate(term.start_date)}</Table.Td>
                          <Table.Td>{formatDate(term.end_date)}</Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="Edit Term">
                                <ActionIcon variant="light" color="blue" onClick={() => openEditTermModal(term, year.id)}>
                                  <IconEdit size={18} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Delete Term">
                                <ActionIcon variant="light" color="red" onClick={() => setConfirmDeleteTerm({ term, yearId: year.id })}>
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
              </Accordion.Panel>
            </Accordion.Item>
          ))
        )}
      </Accordion>

      {/* Academic Year Modal */}
      <Modal
        opened={yearModalOpen}
        onClose={() => setYearModalOpen(false)}
        title={editingYear ? "Edit Academic Year" : "Add Academic Year"}
        size="md"
        centered
      >
        <form onSubmit={yearForm.onSubmit(handleYearSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="e.g., 2024-2025"
              {...yearForm.getInputProps("name")}
              required
            />
            <TextInput
              label="Start Date"
              type="date"
              {...yearForm.getInputProps("start_date")}
              required
            />
            <TextInput
              label="End Date"
              type="date"
              {...yearForm.getInputProps("end_date")}
              required
            />
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setYearModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {editingYear ? "Update" : "Create"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Academic Year Confirmation */}
      <Modal
        opened={!!confirmDeleteYear}
        onClose={() => setConfirmDeleteYear(null)}
        title="Confirm Delete"
        size="sm"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to delete "{confirmDeleteYear?.name}"? This will also delete all its terms. This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDeleteYear(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteYear} loading={loading}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Term Modal */}
      <Modal
        opened={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        title={editingTerm && editingTerm.term ? "Edit Term" : "Add Term"}
        size="md"
        centered
      >
        <form onSubmit={termForm.onSubmit(handleTermSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="e.g., Term 1, Fall 2024"
              {...termForm.getInputProps("name")}
              required
            />
            <TextInput
              label="Start Date"
              type="date"
              {...termForm.getInputProps("start_date")}
              required
            />
            <TextInput
              label="End Date"
              type="date"
              {...termForm.getInputProps("end_date")}
              required
            />
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setTermModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {editingTerm && editingTerm.term ? "Update" : "Create"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Term Confirmation */}
      <Modal
        opened={!!confirmDeleteTerm}
        onClose={() => setConfirmDeleteTerm(null)}
        title="Confirm Delete"
        size="sm"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to delete "{confirmDeleteTerm?.term.name}"? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDeleteTerm(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteTerm} loading={loading}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
};

export default AcademicCalendarClientUI; 