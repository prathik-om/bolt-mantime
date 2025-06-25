"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Title,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  ActionIcon,
  Card,
  Badge,
  Alert,
  Select,
  Table,
  NumberInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPlus, IconEdit, IconTrash, IconCalendar } from "@tabler/icons-react";
import { 
  getTermsWithAcademicYears,
  createTerm,
  updateTerm,
  deleteTerm,
  validateTermDates,
  type TermWithAcademicYear
} from "@/lib/api/academic-calendar";
import { toast } from "sonner";

interface TermsManagementModalProps {
  opened: boolean;
  onClose: () => void;
  schoolId: string;
}

export default function TermsManagementModal({
  opened,
  onClose,
  schoolId,
}: TermsManagementModalProps) {
  const [terms, setTerms] = useState<TermWithAcademicYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermWithAcademicYear | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TermWithAcademicYear | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    period_duration_minutes: 50,
    academic_year_id: "",
  });

  // Load terms
  useEffect(() => {
    if (opened) {
      loadTerms();
    }
  }, [opened, schoolId]);

  const loadTerms = async () => {
    setLoading(true);
    try {
      const data = await getTermsWithAcademicYears(schoolId);
      setTerms(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load terms");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate dates
      const validation = await validateTermDates(
        formData.academic_year_id,
        formData.start_date,
        formData.end_date,
        editingTerm?.id
      );

      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      if (editingTerm) {
        await updateTerm(editingTerm.id, {
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          period_duration_minutes: formData.period_duration_minutes,
        });
        toast.success("Term updated successfully!");
      } else {
        await createTerm({
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          period_duration_minutes: formData.period_duration_minutes,
          academic_year_id: formData.academic_year_id,
        });
        toast.success("Term created successfully!");
      }

      setShowForm(false);
      setEditingTerm(null);
      setFormData({
        name: "",
        start_date: "",
        end_date: "",
        period_duration_minutes: 50,
        academic_year_id: "",
      });
      await loadTerms();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (term: TermWithAcademicYear) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
      period_duration_minutes: term.period_duration_minutes || 50,
      academic_year_id: term.academic_year_id,
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      await deleteTerm(confirmDelete.id);
      toast.success("Term deleted successfully!");
      setConfirmDelete(null);
      await loadTerms();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete term");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      period_duration_minutes: 50,
      academic_year_id: "",
    });
    setEditingTerm(null);
    setShowForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return `${weeks} weeks`;
  };

  // Get unique academic years for the select dropdown
  const academicYears = Array.from(
    new Set(terms.map(term => term.academic_years))
  ).map(year => ({
    value: year.id,
    label: year.name,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Manage Terms"
      size="lg"
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              {editingTerm ? "Edit Term" : "Add Term"}
            </Title>
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Name"
                  placeholder="e.g., Term 1, Fall 2024"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                {!editingTerm && (
                  <Select
                    label="Academic Year"
                    placeholder="Select academic year"
                    data={academicYears}
                    value={formData.academic_year_id}
                    onChange={(value) => setFormData({ ...formData, academic_year_id: value || "" })}
                    required
                  />
                )}
                <DateInput
                  label="Start Date"
                  placeholder="Select start date"
                  valueFormat="YYYY-MM-DD"
                  value={formData.start_date}
                  onChange={(value) => setFormData({ ...formData, start_date: value || "" })}
                  required
                />
                <DateInput
                  label="End Date"
                  placeholder="Select end date"
                  valueFormat="YYYY-MM-DD"
                  value={formData.end_date}
                  onChange={(value) => setFormData({ ...formData, end_date: value || "" })}
                  required
                />
                <NumberInput
                  label="Period Duration (minutes)"
                  placeholder="50"
                  min={30}
                  max={120}
                  value={formData.period_duration_minutes}
                  onChange={(value) => setFormData({ ...formData, period_duration_minutes: typeof value === 'number' ? value : 50 })}
                  description="Duration of each teaching period in minutes"
                />
                <Group justify="flex-end" mt="md">
                  <Button variant="light" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading}>
                    {editingTerm ? "Update" : "Create"}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>
        )}

        {/* Terms List */}
        <div>
          <Group justify="space-between" mb="md">
            <Title order={4}>Terms</Title>
            {!showForm && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setShowForm(true)}
                size="sm"
              >
                Add Term
              </Button>
            )}
          </Group>

          {loading ? (
            <Text ta="center" c="dimmed">Loading...</Text>
          ) : terms.length === 0 ? (
            <Alert color="blue" title="No Terms">
              No terms found. Add terms to organize your academic schedule.
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Academic Year</Table.Th>
                  <Table.Th>Duration</Table.Th>
                  <Table.Th>Period Length</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {terms.map((term) => (
                  <Table.Tr key={term.id}>
                    <Table.Td>
                      <Text fw={500}>{term.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light">
                        {term.academic_years.name}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {formatDate(term.start_date)} - {formatDate(term.end_date)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {calculateDuration(term.start_date, term.end_date)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {term.period_duration_minutes || 50} minutes
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={new Date(term.end_date) < new Date() ? 'red' : 
                               new Date(term.start_date) > new Date() ? 'yellow' : 'green'}
                        variant="light"
                        size="sm"
                      >
                        {new Date(term.end_date) < new Date() ? 'Completed' : 
                         new Date(term.start_date) > new Date() ? 'Upcoming' : 'Active'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleEdit(term)}
                          size="sm"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => setConfirmDelete(term)}
                          size="sm"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>

        {/* Delete Confirmation */}
        {confirmDelete && (
          <Alert color="red" title="Confirm Delete">
            <Text mb="md">
              Are you sure you want to delete "{confirmDelete.name}"? This action cannot be undone.
            </Text>
            <Group>
              <Button
                variant="light"
                onClick={() => setConfirmDelete(null)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleDelete}
                loading={loading}
                size="sm"
              >
                Delete
              </Button>
            </Group>
          </Alert>
        )}
      </Stack>
    </Modal>
  );
} 