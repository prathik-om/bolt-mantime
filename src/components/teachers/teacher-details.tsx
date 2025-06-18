import { Tabs } from "@mantine/core";
import { TeacherQualifications } from "./teacher-qualifications";
import { TeacherSchedule } from "./teacher-schedule";
import { Teacher } from "@/types/teacher";

interface TeacherDetailsProps {
  teacher: Teacher;
}

export function TeacherDetails({ teacher }: TeacherDetailsProps) {
  return (
    <Tabs defaultValue="qualifications">
      <Tabs.List>
        <Tabs.Tab value="qualifications">Qualifications</Tabs.Tab>
        <Tabs.Tab value="schedule">Schedule</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="qualifications" pt="md">
        <TeacherQualifications teacher={teacher} />
      </Tabs.Panel>

      <Tabs.Panel value="schedule" pt="md">
        <TeacherSchedule teacher={teacher} />
      </Tabs.Panel>
    </Tabs>
  );
} 