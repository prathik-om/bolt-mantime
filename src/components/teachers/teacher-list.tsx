'use client'

import { useState } from 'react'
import { Edit2, Trash2, Mail, BookOpen, Clock, AlertCircle } from 'lucide-react'
import { TeacherWithQualifications } from '@/types/database'
import { Card, Button, Text, Group, Stack, Badge, ActionIcon, SimpleGrid, Loader } from '@mantine/core'
import { useQuery } from "@tanstack/react-query";
import { Teacher } from "@/types/teacher";
import { getTeachers } from "@/lib/api/teachers";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { IconPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { TeacherCreateModal } from "./teacher-create-modal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface TeacherListProps {
  teachers: TeacherWithQualifications[]
  isLoading: boolean
  searchQuery: string
  filterDepartment: string
}

export function TeacherList() {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const { data: teachers, isLoading } = useQuery<Teacher[]>({
    queryKey: ["teachers"],
    queryFn: getTeachers,
  });

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    open();
  };

  const handleDelete = (teacher: Teacher) => {
    // TODO: Implement delete functionality
    console.log("Delete teacher:", teacher);
  };

  const handleClose = () => {
    setSelectedTeacher(null);
    close();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Teachers</h2>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setSelectedTeacher(null);
            open();
          }}
        >
          Add Teacher
        </Button>
      </div>

      <DataTable
        columns={columns({ onEdit: handleEdit, onDelete: handleDelete })}
        data={teachers || []}
      />

      <TeacherCreateModal
        opened={opened}
        onClose={handleClose}
        teacher={selectedTeacher}
      />
    </div>
  );
}