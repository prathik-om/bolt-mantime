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
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPlus, IconEdit, IconTrash, IconCalendar } from "@tabler/icons-react";
import { getAcademicYears } from "@/lib/api/schools";
import type { AcademicYear } from "@/lib/api/schools";

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
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    if (opened) {
      loadAcademicYears();
    }
  }, [opened, schoolId]);

  const loadAcademicYears = async () => {
    try {
      setLoading(true);
      const data = await getAcademicYears(schoolId);
      setAcademicYears(data);
    } catch (err) {
      setError("Failed to load academic years");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.name) {
        setError("Academic year name is required");
        return;
      }

      if (!formData.start_date) {
        setError("Start date is required");
        return;
      }

      if (!formData.end_date) {
        setError("End date is required");
        return;
      }

      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        setError("End date must be after start date");
        return;
      }

      const yearData = {
        ...formData,
        school_id: schoolId,
      };

      // TODO: Add createAcademicYear and updateAcademicYear functions to schools API
      if (editingYear) {
        // await updateAcademicYear(editingYear.id, yearData);
        console.log("Update academic year:", yearData);
      } else {
        // await createAcademicYear(yearData);
        console.log("Create academic year:", yearData);
      }

      await loadAcademicYears();
      resetForm();
    } catch (err) {
      setError("Failed to save academic year");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      // TODO: Add deleteAcademicYear function to schools API
      // await deleteAcademicYear(id);
      console.log("Delete academic year:", id);
      await loadAcademicYears();
    } catch (err) {
      setError("Failed to delete academic year");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
    });
    setEditingYear(null);
    setShowForm(false);
  };

  const addCommonAcademicYears = async () => {
    const currentYear = new Date().getFullYear();
    const commonYears = [
      {
        name: `${currentYear}-${currentYear + 1}`,
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
      },
      {
        name: `${currentYear + 1}-${currentYear + 2}`,
        start_date: `${currentYear + 1}-01-01`,
        end_date: `${currentYear + 1}-12-31`,
      },
    ];

    try {
      setLoading(true);
      // TODO: Add bulk create function
      console.log("Add common academic years:", commonYears);
      await loadAcademicYears();
    } catch (err) {
      setError("Failed to add common academic years");
    } finally {
      setLoading(false);
    }
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
              {editingYear ? "Edit Academic Year" : "Add New Academic Year"}
            </Title>
            <Stack gap="md">
              <TextInput
                label="Academic Year Name"
                placeholder="e.g., 2024-2025, Year 10 2024"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Group grow>
                <DateInput
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(value) => setFormData({ ...formData, start_date: value || "" })}
                  required
                />
                <DateInput
                  label="End Date"
                  value={formData.end_date}
                  onChange={(value) => setFormData({ ...formData, end_date: value || "" })}
                  required
                />
              </Group>
              <Group justify="flex-end">
                <Button variant="light" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} loading={loading}>
                  {editingYear ? "Update" : "Create"} Academic Year
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {/* Academic Years List */}
        <div>
          <Group justify="space-between" mb="md">
            <Title order={4}>Academic Years</Title>
            <Group>
              {!showForm && (
                <>
                  <Button
                    variant="light"
                    leftSection={<IconCalendar size={16} />}
                    onClick={addCommonAcademicYears}
                    size="sm"
                  >
                    Add Common Years
                  </Button>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setShowForm(true)}
                    size="sm"
                  >
                    Add Academic Year
                  </Button>
                </>
              )}
            </Group>
          </Group>

          {academicYears.length === 0 ? (
            <Alert color="blue" title="No Academic Years">
              No academic years configured yet. Click "Add Academic Year" to get started.
            </Alert>
          ) : (
            <Stack gap="sm">
              {academicYears.map((year) => (
                <Card key={year.id} shadow="sm" padding="md" radius="md" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>{year.name}</Text>
                      <Text size="sm" c="dimmed">
                        {new Date(year.start_date).toISOString().split('T')[0]} - {new Date(year.end_date).toISOString().split('T')[0]}
                      </Text>
                    </div>
                    <Group>
                      <Badge color="green" variant="light">
                        Active
                      </Badge>
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleEdit(year)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(year.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </div>

        <Group justify="flex-end">
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
} 