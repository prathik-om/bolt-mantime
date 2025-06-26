"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';
import { displayError } from '@/lib/utils/error-handling';
import { Button, Card, Text, Select, Group, Stack, Badge, Checkbox } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { EmptyState } from '@/components/ui/empty-state';

type Grade = Database['public']['Tables']['grades']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];
type Teacher = Database['public']['Tables']['teachers']['Row'];
type TeacherQualification = Database['public']['Tables']['teacher_subject_qualifications']['Row'] & {
  subjects: Subject;
  grades: Grade;
};

interface Props {
  schoolId: string;
  teachers: Teacher[];
  subjects: Subject[];
  grades: Grade[];
  initialQualifications?: TeacherQualification[];
}

export default function TeacherQualificationsClientUI({
  schoolId,
  teachers,
  subjects,
  grades,
  initialQualifications = []
}: Props) {
  const [qualifications, setQualifications] = useState<TeacherQualification[]>(initialQualifications);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      teacher_id: '',
      subject_id: '',
      grade_id: null as number | null,
      proficiency_level: 'qualified' as 'expert' | 'qualified' | 'learning',
      is_preferred: false
    },
    validate: {
      teacher_id: (value) => (!value ? 'Teacher is required' : null),
      subject_id: (value) => (!value ? 'Subject is required' : null),
      grade_id: (value) => (!value ? 'Grade is required' : null)
    }
  });

  const onSubmit = async (values: typeof form.values) => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Check if qualification already exists
      const { data: existing } = await supabase
        .from('teacher_subject_qualifications')
        .select('id')
        .eq('teacher_id', values.teacher_id)
        .eq('subject_id', values.subject_id)
        .eq('grade_id', values.grade_id)
        .maybeSingle();

      if (existing) {
        notifications.show({
          title: 'Error',
          message: 'This qualification already exists for this teacher',
          color: 'red'
        });
        return;
      }

      const { data, error } = await supabase
        .from('teacher_subject_qualifications')
        .insert({
          teacher_id: values.teacher_id,
          subject_id: values.subject_id,
          grade_id: values.grade_id,
          proficiency_level: values.proficiency_level,
          is_preferred: values.is_preferred
        })
        .select(`
          *,
          subjects (
            id,
            name,
            code
          ),
          grades (
            id,
            grade_name
          )
        `)
        .single();

      if (error) throw error;

      setQualifications([...qualifications, data]);
      form.reset();
      notifications.show({
        title: 'Success',
        message: 'Teacher qualification added successfully',
        color: 'green'
      });
    } catch (error) {
      displayError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (qualification: TeacherQualification) => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('teacher_subject_qualifications')
        .delete()
        .eq('id', qualification.id);

      if (error) throw error;

      setQualifications(qualifications.filter(q => q.id !== qualification.id));
      notifications.show({
        title: 'Success',
        message: 'Teacher qualification removed successfully',
        color: 'green'
      });
    } catch (error) {
      displayError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Text size="xl" fw={600}>Teacher Qualifications</Text>
      <Text size="sm" c="dimmed">Manage teacher subject qualifications and preferences</Text>

      <Card mt="lg">
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap="md">
            <Select
              label="Teacher"
              placeholder="Select teacher"
              data={teachers.map(teacher => ({
                value: teacher.id,
                label: teacher.full_name || `${teacher.first_name} ${teacher.last_name}`
              }))}
              {...form.getInputProps('teacher_id')}
              required
            />

            <Select
              label="Subject"
              placeholder="Select subject"
              data={subjects.map(subject => ({
                value: subject.id,
                label: subject.name
              }))}
              {...form.getInputProps('subject_id')}
              required
            />

            <Select
              label="Grade"
              placeholder="Select grade"
              data={grades.map(grade => ({
                value: grade.id.toString(),
                label: grade.grade_name
              }))}
              {...form.getInputProps('grade_id')}
              required
            />

            <Select
              label="Proficiency Level"
              placeholder="Select proficiency level"
              data={[
                { value: 'expert', label: 'Expert' },
                { value: 'qualified', label: 'Qualified' },
                { value: 'learning', label: 'Learning' }
              ]}
              {...form.getInputProps('proficiency_level')}
              required
            />

            <Checkbox
              label="Preferred Subject"
              description="Mark this as a preferred subject for this teacher"
              {...form.getInputProps('is_preferred', { type: 'checkbox' })}
            />

            <Button type="submit" loading={loading}>
              Add Qualification
            </Button>
          </Stack>
        </form>
      </Card>

      {qualifications.length === 0 ? (
        <EmptyState
          title="No qualifications yet"
          description="Start by adding subject qualifications for your teachers."
        />
      ) : (
        <div className="mt-8 space-y-6">
          {qualifications.map((qualification) => (
            <Card key={qualification.id} withBorder>
              <Group position="apart">
                <div>
                  <Text fw={500}>{teachers.find(t => t.id === qualification.teacher_id)?.full_name}</Text>
                  <Text size="sm">
                    {qualification.subjects.name} - {qualification.grades.grade_name}
                  </Text>
                  <Group mt="xs">
                    <Badge color={qualification.is_preferred ? 'green' : 'blue'}>
                      {qualification.is_preferred ? 'Preferred' : 'Regular'}
                    </Badge>
                    <Badge color={
                      qualification.proficiency_level === 'expert' ? 'green' :
                      qualification.proficiency_level === 'qualified' ? 'blue' : 'yellow'
                    }>
                      {qualification.proficiency_level}
                    </Badge>
                  </Group>
                </div>
                <Button
                  variant="light"
                  color="red"
                  onClick={() => handleDelete(qualification)}
                >
                  Remove
                </Button>
              </Group>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}