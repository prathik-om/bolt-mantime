import { useQuery } from "@tanstack/react-query";
import { getTeacherSchedule } from "@/lib/api/teachers";
import { Card, Text, Stack, Group, Badge } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import { Teacher } from "@/types/teacher";

interface TeacherScheduleProps {
  teacher: Teacher;
}

export function TeacherSchedule({ teacher }: TeacherScheduleProps) {
  const { data: schedule, isLoading } = useQuery({
    queryKey: ["teacher-schedule", teacher.id],
    queryFn: () => getTeacherSchedule(teacher.id),
  });

  if (isLoading) {
    return <Text>Loading schedule...</Text>;
  }

  if (!schedule || schedule.length === 0) {
    return (
      <Card padding="xl" ta="center">
        <Text c="dimmed">No schedule assigned yet</Text>
      </Card>
    );
  }

  return (
    <Stack>
      {schedule.map((slot) => (
        <Card key={slot.id} padding="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={500}>{slot.subject?.name}</Text>
            <Badge color="blue" variant="light">
              {slot.class?.name}
            </Badge>
          </Group>
          <Group gap="xs" c="dimmed">
            <IconClock size={16} />
            <Text size="sm">
              {slot.day} • Period {slot.period}
            </Text>
          </Group>
        </Card>
      ))}
    </Stack>
  );
} 