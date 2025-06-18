import { Card, Text, Group, Stack, Badge, Button } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import { TeacherDetails } from "./teacher-details";
import { Teacher } from "@/types/teacher";

interface TeacherProfileProps {
  teacher: Teacher;
  onEdit: (teacher: Teacher) => void;
}

export function TeacherProfile({ teacher, onEdit }: TeacherProfileProps) {
  return (
    <Stack>
      <Card padding="xl" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text size="xl" fw={600}>
              {teacher.first_name} {teacher.last_name}
            </Text>
            <Text c="dimmed">{teacher.email}</Text>
          </div>
          <Button
            leftSection={<IconEdit size={16} />}
            variant="light"
            onClick={() => onEdit(teacher)}
          >
            Edit Profile
          </Button>
        </Group>

        <Stack gap="xs">
          <Group>
            <Text fw={500} size="sm">
              Department:
            </Text>
            <Text size="sm">{teacher.department?.name || "—"}</Text>
          </Group>

          <Group>
            <Text fw={500} size="sm">
              Max Periods per Week:
            </Text>
            <Text size="sm">{teacher.max_periods_per_week || "—"}</Text>
          </Group>

          <Group>
            <Text fw={500} size="sm">
              Status:
            </Text>
            <Badge color={teacher.is_active ? "green" : "red"}>
              {teacher.is_active ? "Active" : "Inactive"}
            </Badge>
          </Group>
        </Stack>
      </Card>

      <TeacherDetails teacher={teacher} />
    </Stack>
  );
} 