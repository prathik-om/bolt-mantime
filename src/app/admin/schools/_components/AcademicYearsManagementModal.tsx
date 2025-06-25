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
  Divider,
  Table,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPlus, IconEdit, IconTrash, IconCalendar } from "@tabler/icons-react";
import { 
  getAcademicYearsWithTerms,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  validateAcademicYearDates,
  type AcademicYearWithTerms
} from "@/lib/api/academic-calendar";
import { toast } from "sonner";

interface AcademicYearsManagementModalProps {
  opened: boolean;
  onClose: () => void;
  schoolId: string;
}

export default function AcademicYearsManagementModal({
  opened,
  onClose,
  schoolId,
}: AcademicYearsManagementModalProps) {
  const [academicYears, setAcademicYears] = useState<AcademicYearWithTerms[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYearWithTerms | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AcademicYearWithTerms | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  // Load academic years
  useEffect(() => {
    if (opened) {
      loadAcademicYears();
    }
  }, [opened, schoolId]);

  const loadAcademicYears = async () => {
    setLoading(true);
    try {
      const data = await getAcademicYearsWithTerms(schoolId);
      setAcademicYears(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load academic years");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate dates
      const validation = await validateAcademicYearDates(
        schoolId,
        formData.start_date,
        formData.end_date,
        editingYear?.id
      );

      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      if (editingYear) {
        await updateAcademicYear(editingYear.id, formData);
        toast.success("Academic year updated successfully!");
      } else {
        await createAcademicYear({
          ...formData,
          school_id: schoolId,
        });
        toast.success("Academic year created successfully!");
      }

      setShowForm(false);
      setEditingYear(null);
      setFormData({ name: "", start_date: "", end_date: "" });
      await loadAcademicYears();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (year: AcademicYearWithTerms) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      await deleteAcademicYear(confirmDelete.id);
      toast.success("Academic year deleted successfully!");
      setConfirmDelete(null);
      await loadAcademicYears();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete academic year");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", start_date: "", end_date: "" });
    setEditingYear(null);
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Manage Academic Years"
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
              {editingYear ? "Edit Academic Year" : "Add Academic Year"}
            </Title>
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Name"
                  placeholder="e.g., 2024-2025"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
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
                <Group justify="flex-end" mt="md">
                  <Button variant="light" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading}>
                    {editingYear ? "Update" : "Create"}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>
        )}

        {/* Academic Years List */}
        <div>
          <Group justify="space-between" mb="md">
            <Title order={4}>Academic Years</Title>
            {!showForm && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setShowForm(true)}
                size="sm"
              >
                Add Academic Year
              </Button>
            )}
          </Group>

          {loading ? (
            <Text ta="center" c="dimmed">Loading...</Text>
          ) : academicYears.length === 0 ? (
            <Alert color="blue" title="No Academic Years">
              No academic years found. Add your first academic year to get started.
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Duration</Table.Th>
                  <Table.Th>Terms</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {academicYears.map((year) => (
                  <Table.Tr key={year.id}>
                    <Table.Td>
                      <Text fw={500}>{year.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {formatDate(year.start_date)} - {formatDate(year.end_date)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {calculateDuration(year.start_date, year.end_date)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light">
                        {year.terms.length} terms
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleEdit(year)}
                          size="sm"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => setConfirmDelete(year)}
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
              Are you sure you want to delete "{confirmDelete.name}"? This will also delete all its terms and cannot be undone.
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