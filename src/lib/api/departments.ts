export async function getDepartments(): Promise<{ id: string; name: string }[]> {
  const response = await fetch("/api/departments");
  if (!response.ok) {
    throw new Error("Failed to fetch departments");
  }
  return response.json();
} 