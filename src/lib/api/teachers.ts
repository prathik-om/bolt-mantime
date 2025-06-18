import { Teacher } from "@/types/teacher";

export async function getTeachers(): Promise<Teacher[]> {
  const response = await fetch("/api/teachers");
  if (!response.ok) {
    throw new Error("Failed to fetch teachers");
  }
  return response.json();
}

export async function getTeacher(id: string): Promise<Teacher> {
  const response = await fetch(`/api/teachers/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch teacher");
  }
  return response.json();
}

export async function createTeacher(data: Omit<Teacher, "id">): Promise<Teacher> {
  const response = await fetch("/api/teachers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to create teacher");
  }
  return response.json();
}

export async function updateTeacher(data: Teacher): Promise<Teacher> {
  const response = await fetch(`/api/teachers/${data.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update teacher");
  }
  return response.json();
}

export async function deleteTeacher(id: string): Promise<void> {
  const response = await fetch(`/api/teachers/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete teacher");
  }
}

export async function getTeacherSchedule(teacherId: string): Promise<any[]> {
  const response = await fetch(`/api/teachers/${teacherId}/schedule`);
  if (!response.ok) {
    throw new Error("Failed to fetch teacher schedule");
  }
  return response.json();
}

export async function addQualification(data: {
  teacherId: string;
  subjectId: string;
}): Promise<void> {
  const response = await fetch(`/api/teachers/${data.teacherId}/qualifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subjectId: data.subjectId }),
  });
  if (!response.ok) {
    throw new Error("Failed to add qualification");
  }
}

export async function removeQualification(data: {
  teacherId: string;
  qualificationId: string;
}): Promise<void> {
  const response = await fetch(
    `/api/teachers/${data.teacherId}/qualifications/${data.qualificationId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) {
    throw new Error("Failed to remove qualification");
  }
} 