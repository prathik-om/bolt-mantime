"use client";

import React, { useState } from "react";
import {
  Modal,
  TextInput,
  NumberInput,
  MultiSelect,
  Button,
  Stack,
  Group,
  Text,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { toast } from "sonner";
import { createClient } from '@/utils/supabase/client';
import type { Database } from "@/types/database";

type School = Database['public']['Tables']['schools']['Row'];

interface SchoolEditModalProps {
  school: School;
  opened: boolean;
  onClose: () => void;
  onUpdate: (updatedSchool: School) => void;
}

const workingDaysOptions = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const SchoolEditModal: React.FC<SchoolEditModalProps> = ({
  school,
  opened,
  onClose,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: school.name,
      start_time: school.start_time || '',
      end_time: school.end_time || '',
      period_duration: school.period_duration || 45,
      sessions_per_day: school.sessions_per_day || 8,
      working_days: school.working_days || [],
    },
    validate: {
      name: (value) => (value.length < 2 ? "School name must be at least 2 characters" : null),
      start_time: (value) => (!value ? "Start time is required" : null),
      end_time: (value) => (!value ? "End time is required" : null),
      period_duration: (value) => (value <= 0 ? "Period duration must be greater than 0" : null),
      sessions_per_day: (value) => (value <= 0 ? "Sessions per day must be greater than 0" : null),
      working_days: (value) => (value.length === 0 ? "At least one working day must be selected" : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const { data, error } = await createClient()
        .from("schools")
        .update({
          name: values.name,
          start_time: values.start_time,
          end_time: values.end_time,
          period_duration: values.period_duration,
          sessions_per_day: values.sessions_per_day,
          working_days: values.working_days,
        })
        .eq("id", school.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("School information updated successfully!");
      onUpdate(data);
      onClose();
    } catch (err: any) {
      console.error('Error updating school:', err);
      toast.error(err.message || "Failed to update school information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit School Information"
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="School Name"
            placeholder="Enter school name"
            required
            {...form.getInputProps('name')}
          />

          <TextInput
            label="Start Time"
            placeholder="08:00"
            type="time"
            required
            {...form.getInputProps('start_time')}
          />

          <TextInput
            label="End Time"
            placeholder="15:00"
            type="time"
            required
            {...form.getInputProps('end_time')}
          />

          <Group grow>
            <NumberInput
              label="Period Duration (minutes)"
              placeholder="45"
              min={1}
              max={120}
              required
              {...form.getInputProps('period_duration')}
            />

            <NumberInput
              label="Sessions per Day"
              placeholder="8"
              min={1}
              max={12}
              required
              {...form.getInputProps('sessions_per_day')}
            />
          </Group>

          <MultiSelect
            label="Working Days"
            placeholder="Select working days"
            data={workingDaysOptions}
            required
            {...form.getInputProps('working_days')}
          />

          <Alert color="blue" title="Note">
            Changes to school configuration will affect timetable generation and scheduling.
          </Alert>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default SchoolEditModal; 