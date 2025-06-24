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
      working_days: school.working_days || [],
    },
    validate: {
      name: (value) => (value.length < 2 ? "School name must be at least 2 characters" : null),
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

          <MultiSelect
            label="Working Days"
            placeholder="Select working days"
            data={workingDaysOptions}
            required
            {...form.getInputProps('working_days')}
          />

          <Alert color="blue" title="Note">
            You can edit basic school information here. For scheduling configuration, use the Daily Schedule management.
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