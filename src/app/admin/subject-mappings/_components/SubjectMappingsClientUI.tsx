import { Button, Card, Text } from '@mantine/core';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { EmptyState } from '@/components/ui/empty-state';

type Subject = Database['public']['Tables']['subjects']['Row'] & {
  departments: {
    id: string;
    name: string;
  } | null;
  class_offerings: Array<{
    id: string;
    class_id: string;
    periods_per_week: number;
    required_hours_per_term: number | null;
    term_id: string;
    classes: {
      id: string;
      name: string;
      grade_id: number;
      section: string;
    } | null;
  }>;
};

type Department = {
  id: string;
  name: string;
  school_id: string;
};

interface Props {
  schoolId: string;
  subjectsWithOfferings: Subject[];
  departments: Department[];
}

export default function SubjectMappingsClientUI({
  schoolId,
  subjectsWithOfferings,
  departments
}: Props) {
  // Group subjects by department for better organization
  const subjectsByDepartment = subjectsWithOfferings.reduce((acc, subject) => {
    const deptName = subject.departments?.name || 'Uncategorized';
    if (!acc[deptName]) {
      acc[deptName] = [];
    }
    acc[deptName].push(subject);
    return acc;
  }, {} as Record<string, Subject[]>);

  return (
    <div>
      <Text size="xl" fw={600}>Subject Mappings</Text>
      <Text size="sm" c="dimmed">View and edit which subjects are offered to which classes</Text>

      {subjectsWithOfferings.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="No subjects found. Please add some subjects first."
          action={<Button component={Link} href="/admin/subjects">Add Subjects</Button>}
        />
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(subjectsByDepartment).map(([deptName, subjects]) => (
            <Card key={deptName} className="p-6">
              <Text size="lg" fw={600} className="mb-4">{deptName}</Text>
              <div className="space-y-6">
                {subjects.map((subject) => (
                  <div key={subject.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <Text fw={500}>{subject.name}</Text>
                        {subject.code && (
                          <Text size="sm" c="dimmed">Code: {subject.code}</Text>
                        )}
                      </div>
                      <Button
                        variant="light"
                        component={Link}
                        href={`/admin/class-offerings?subject=${subject.id}`}
                      >
                        Manage Offerings
                      </Button>
                    </div>

                    {subject.class_offerings && subject.class_offerings.length > 0 ? (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subject.class_offerings.map((offering) => (
                          <Card key={offering.id} withBorder>
                            <Text size="sm" fw={500}>{offering.classes?.name}</Text>
                            <Text size="xs" c="dimmed">
                              {offering.periods_per_week} periods/week
                              {offering.required_hours_per_term && 
                                ` (${offering.required_hours_per_term} hours required)`
                              }
                            </Text>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Text size="sm" c="dimmed" mt="sm">No class offerings yet</Text>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 