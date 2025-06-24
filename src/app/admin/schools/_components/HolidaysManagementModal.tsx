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
  Select,
  Alert,
  ActionIcon,
  Tooltip,
  Card,
  Badge,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPlus, IconEdit, IconTrash, IconCalendar } from "@tabler/icons-react";
import { getHolidaysByAcademicYear, createHoliday, updateHoliday, deleteHoliday, createBulkHolidays } from "@/lib/api/holidays";
import { getAcademicYears } from "@/lib/api/schools";
import type { Holiday } from "@/lib/api/holidays";
import type { AcademicYear } from "@/lib/api/schools";

interface HolidaysManagementModalProps {
  opened: boolean;
  onClose: () => void;
  schoolId: string;
}

export default function HolidaysManagementModal({
  opened,
  onClose,
  schoolId,
}: HolidaysManagementModalProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: "",
    reason: "",
  });

  useEffect(() => {
    if (opened) {
      loadAcademicYears();
    }
  }, [opened, schoolId]);

  useEffect(() => {
    if (selectedAcademicYear) {
      loadHolidays();
    }
  }, [selectedAcademicYear]);

  const loadAcademicYears = async () => {
    try {
      setLoading(true);
      const data = await getAcademicYears(schoolId);
      setAcademicYears(data);
      if (data.length > 0) {
        setSelectedAcademicYear(data[0].id);
      }
    } catch (err) {
      setError("Failed to load academic years");
    } finally {
      setLoading(false);
    }
  };

  const loadHolidays = async () => {
    if (!selectedAcademicYear) return;
    
    try {
      setLoading(true);
      const data = await getHolidaysByAcademicYear(selectedAcademicYear);
      setHolidays(data);
    } catch (err) {
      setError("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.date) {
        setError("Holiday date is required");
        return;
      }

      if (!formData.reason) {
        setError("Reason is required");
        return;
      }

      if (!selectedAcademicYear) {
        setError("Please select an academic year");
        return;
      }

      const holidayData = {
        ...formData,
        academic_year_id: selectedAcademicYear,
        school_id: schoolId,
      };

      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, holidayData);
      } else {
        await createHoliday(holidayData);
      }

      await loadHolidays();
      resetForm();
    } catch (err) {
      setError("Failed to save holiday");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await deleteHoliday(id);
      await loadHolidays();
    } catch (err) {
      setError("Failed to delete holiday");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      date: holiday.date,
      reason: holiday.reason,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: "",
      reason: "",
    });
    setEditingHoliday(null);
    setShowForm(false);
  };

  const getSelectedAcademicYear = () => {
    return academicYears.find(ay => ay.id === selectedAcademicYear);
  };

  const addCommonHolidays = async () => {
    if (!selectedAcademicYear) {
      setError("Please select an academic year");
      return;
    }

    const academicYear = getSelectedAcademicYear();
    if (!academicYear) return;

    const commonHolidays = [
      { date: "2024-12-25", reason: "Christmas Day" },
      { date: "2024-12-26", reason: "Boxing Day" },
      { date: "2025-01-01", reason: "New Year's Day" },
      { date: "2025-01-27", reason: "Australia Day" },
      { date: "2025-04-18", reason: "Good Friday" },
      { date: "2025-04-21", reason: "Easter Monday" },
      { date: "2025-04-25", reason: "ANZAC Day" },
    ];

    try {
      setLoading(true);
      const holidaysToCreate = commonHolidays.map(holiday => ({
        ...holiday,
        academic_year_id: selectedAcademicYear,
        school_id: schoolId,
      }));
      
      await createBulkHolidays(holidaysToCreate);
      await loadHolidays();
    } catch (err) {
      setError("Failed to add common holidays");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Manage Holidays"
      size="lg"
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Academic Year Selection */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">Academic Year</Title>
          <Select
            label="Select Academic Year"
            value={selectedAcademicYear}
            onChange={(value) => setSelectedAcademicYear(value || "")}
            data={academicYears.map(ay => ({
              value: ay.id,
              label: `${ay.name} (${new Date(ay.start_date).getFullYear()})`
            }))}
            placeholder="Select an academic year"
          />
        </Card>

        {/* Add/Edit Form */}
        {showForm && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              {editingHoliday ? "Edit Holiday" : "Add New Holiday"}
            </Title>
            <Stack gap="md">
              <DateInput
                label="Holiday Date"
                value={formData.date}
                onChange={(value) => setFormData({ ...formData, date: value || "" })}
                required
              />
              <Textarea
                label="Reason"
                placeholder="e.g., Christmas Day, School Holiday"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                minRows={2}
              />
              <Group justify="flex-end">
                <Button variant="light" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} loading={loading}>
                  {editingHoliday ? "Update" : "Create"} Holiday
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {/* Holidays List */}
        <div>
          <Group justify="space-between" mb="md">
            <Title order={4}>Holidays</Title>
            <Group>
              {!showForm && (
                <>
                  <Button
                    variant="light"
                    leftSection={<IconCalendar size={16} />}
                    onClick={addCommonHolidays}
                    size="sm"
                    disabled={!selectedAcademicYear}
                  >
                    Add Common Holidays
                  </Button>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setShowForm(true)}
                    size="sm"
                    disabled={!selectedAcademicYear}
                  >
                    Add Holiday
                  </Button>
                </>
              )}
            </Group>
          </Group>

          {!selectedAcademicYear ? (
            <Alert color="blue" title="Select Academic Year">
              Please select an academic year to view and manage holidays.
            </Alert>
          ) : holidays.length === 0 ? (
            <Alert color="blue" title="No Holidays">
              No holidays configured for this academic year. Click "Add Holiday" to get started.
            </Alert>
          ) : (
            <Stack gap="sm">
              {holidays.map((holiday) => (
                <Card key={holiday.id} shadow="sm" padding="md" radius="md" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>{holiday.reason}</Text>
                      <Text size="sm" c="dimmed">
                        {new Date(holiday.date).toISOString().split('T')[0]}
                      </Text>
                    </div>
                    <Group>
                      <Tooltip label="Edit Holiday">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleEdit(holiday)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete Holiday">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(holiday.id)}
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
        </div>

        <Group justify="flex-end">
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
} 