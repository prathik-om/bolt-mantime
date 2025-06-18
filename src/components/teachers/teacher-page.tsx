import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTeacher } from "@/lib/api/teachers";
import { TeacherProfile } from "./teacher-profile";
import { TeacherCreateModal } from "./teacher-create-modal";
import { useDisclosure } from "@mantine/hooks";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Teacher } from "@/types/teacher";

interface TeacherPageProps {
  teacherId: string;
}

export function TeacherPage({ teacherId }: TeacherPageProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["teacher", teacherId],
    queryFn: () => getTeacher(teacherId),
  });

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    open();
  };

  const handleClose = () => {
    setSelectedTeacher(null);
    close();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!teacher) {
    return <div>Teacher not found</div>;
  }

  return (
    <>
      <TeacherProfile teacher={teacher} onEdit={handleEdit} />
      <TeacherCreateModal
        opened={opened}
        onClose={handleClose}
        teacher={selectedTeacher}
      />
    </>
  );
} 