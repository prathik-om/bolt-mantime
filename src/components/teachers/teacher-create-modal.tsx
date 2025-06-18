import { useEffect } from "react";
import { useForm } from "@mantine/form";
import { Modal, TextInput, Button, Stack, NumberInput, Select, Switch } from "@mantine/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDepartments } from "@/lib/api/departments";
import { createTeacher, updateTeacher } from "@/lib/api/teachers";
import { notifications } from "@mantine/notifications";
import { Teacher } from "@/types/teacher";

interface TeacherCreateModalProps {
  opened: boolean;
  onClose: () => void;
  teacher?: Teacher | null;
}

interface TeacherFormValues {
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  max_periods_per_week: number;
  is_active: boolean;
}

export function TeacherCreateModal({ opened, onClose, teacher }: TeacherCreateModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!teacher;

  const form = useForm<TeacherFormValues>({
    initialValues: {
      first_name: "",
      last_name: "",
      email: "",
      department_id: "",
      max_periods_per_week: 0,
      is_active: true,
    },
    validate: {
      first_name: (value) => (!value ? "First name is required" : null),
      last_name: (value) => (!value ? "Last name is required" : null),
      email: (value) => (!value ? "Email is required" : /^\S+@\S+$/.test(value) ? null : "Invalid email"),
      department_id: (value) => (!value ? "Department is required" : null),
      max_periods_per_week: (value) => (value < 0 ? "Must be a positive number" : null),
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
  });

  const createMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      notifications.show({
        title: "Success",
        message: "Teacher created successfully",
        color: "green",
      });
      onClose();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to create teacher",
        color: "red",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      notifications.show({
        title: "Success",
        message: "Teacher updated successfully",
        color: "green",
      });
      onClose();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to update teacher",
        color: "red",
      });
    },
  });

  useEffect(() => {
    if (teacher) {
      form.setValues({
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        department_id: teacher.department_id,
        max_periods_per_week: teacher.max_periods_per_week,
        is_active: teacher.is_active,
      });
    } else {
      form.reset();
    }
  }, [teacher, form]);

  const handleSubmit = (values: TeacherFormValues) => {
    if (isEditing && teacher) {
      updateMutation.mutate({ id: teacher.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? "Edit Teacher" : "Add Teacher"}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="First Name"
            placeholder="Enter first name"
            {...form.getInputProps("first_name")}
          />
          <TextInput
            label="Last Name"
            placeholder="Enter last name"
            {...form.getInputProps("last_name")}
          />
          <TextInput
            label="Email"
            placeholder="Enter email"
            {...form.getInputProps("email")}
          />
          <Select
            label="Department"
            placeholder="Select department"
            data={departments?.map((dept) => ({
              value: dept.id,
              label: dept.name,
            })) || []}
            {...form.getInputProps("department_id")}
          />
          <NumberInput
            label="Max Periods per Week"
            placeholder="Enter max periods"
            min={0}
            {...form.getInputProps("max_periods_per_week")}
          />
          <Switch
            label="Active"
            {...form.getInputProps("is_active", { type: "checkbox" })}
          />
          <Button
            type="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? "Update" : "Create"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
} 