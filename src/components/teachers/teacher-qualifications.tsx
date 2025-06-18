import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubjects } from "@/lib/api/subjects";
import { addQualification, removeQualification } from "@/lib/api/teachers";
import { Button, Select, Stack, Group, Badge, ActionIcon } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { Teacher } from "@/types/teacher";

interface TeacherQualificationsProps {
  teacher: Teacher;
}

export function TeacherQualifications({ teacher }: TeacherQualificationsProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: getSubjects,
  });

  const addMutation = useMutation({
    mutationFn: addQualification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      notifications.show({
        title: "Success",
        message: "Qualification added successfully",
        color: "green",
      });
      setSelectedSubject(null);
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to add qualification",
        color: "red",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeQualification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      notifications.show({
        title: "Success",
        message: "Qualification removed successfully",
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to remove qualification",
        color: "red",
      });
    },
  });

  const handleAdd = () => {
    if (selectedSubject) {
      addMutation.mutate({ teacherId: teacher.id, subjectId: selectedSubject });
    }
  };

  const handleRemove = (qualificationId: string) => {
    removeMutation.mutate({ teacherId: teacher.id, qualificationId });
  };

  const availableSubjects = subjects?.filter(
    (subject) =>
      !teacher.qualifications?.some((q) => q.subject_id === subject.id)
  ) || [];

  return (
    <Stack>
      <Group>
        <Select
          placeholder="Select subject"
          data={availableSubjects.map((subject) => ({
            value: subject.id,
            label: subject.name,
          }))}
          value={selectedSubject}
          onChange={setSelectedSubject}
          style={{ flex: 1 }}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleAdd}
          loading={addMutation.isPending}
          disabled={!selectedSubject}
        >
          Add
        </Button>
      </Group>

      <Group>
        {teacher.qualifications?.map((qualification) => (
          <Badge
            key={qualification.id}
            color="blue"
            variant="light"
            rightSection={
              <ActionIcon
                size="xs"
                color="blue"
                variant="transparent"
                onClick={() => handleRemove(qualification.id)}
                loading={removeMutation.isPending}
              >
                <IconTrash size={14} />
              </ActionIcon>
            }
          >
            {qualification.subject?.name}
          </Badge>
        ))}
      </Group>
    </Stack>
  );
} 