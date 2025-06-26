"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/database.types';
import { displayError } from '@/lib/utils/error-handling';
import { Button, Card, Text, Select, Group, Stack, Badge, NumberInput, Checkbox } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { EmptyState } from '@/components/ui/empty-state';

type Grade = Database['public']['Tables']['grades']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];
type GradeSubject = Database['public']['Tables']['grade_subjects']['Row'] & {
  subjects: Subject;
  grades: Grade;
};

interface Props {
  schoolId: string;
  subjects: Subject[];
  grades: Grade[];
  initialMappings?: GradeSubject[];
}

export default function GradeSubjectsClientUI({
  schoolId,
  subjects,
  grades,
  initialMappings = []
}: Props) {
  const [mappings, setMappings] = useState<GradeSubject[]>(initialMappings);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      subject_id: '',
      grade_id: null as number | null,
      is_mandatory: true,
      suggested_hours_per_week: 1
    },
    validate: {
      subject_id: (value) => (!value ? 'Subject is required' : null),
      grade_id: (value) => (!value ? 'Grade is required' : null),
      suggested_hours_per_week: (value) => (value < 1 ? 'Must be at least 1 hour per week' : null)
    }
  });

  const onSubmit = async (values: typeof form.values) => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Check if mapping already exists
      const { data: existing } = await supabase
        .from('grade_subjects')
        .select('id')
        .eq('school_id', schoolId)
        .eq('subject_id', values.subject_id)
        .eq('grade_id', values.grade_id)
        .maybeSingle();

      if (existing) {
        notifications.show({
          title: 'Error',
          message: 'This subject is already mapped to this grade',
          color: 'red'
        });
        return;
      }

      const { data, error } = await supabase
        .from('grade_subjects')
        .insert({
          school_id: schoolId,
          subject_id: values.subject_id,
          grade_id: values.grade_id,
          is_mandatory: values.is_mandatory,
          suggested_hours_per_week: values.suggested_hours_per_week
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

      setMappings([...mappings, data]);
      form.reset();
      notifications.show({
        title: 'Success',
        message: 'Grade-subject mapping added successfully',
        color: 'green'
      });
    } catch (error) {
      displayError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mapping: GradeSubject) => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('grade_subjects')
        .delete()
        .eq('id', mapping.id);

      if (error) throw error;

      setMappings(mappings.filter(m => m.id !== mapping.id));
      notifications.show({
        title: 'Success',
        message: 'Grade-subject mapping removed successfully',
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
      <Text size="xl" fw={600}>Grade-Subject Mappings</Text>
      <Text size="sm" c="dimmed">Manage which subjects are taught in each grade</Text>

      <Card mt="lg">
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap="md">
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

            <NumberInput
              label="Suggested Hours per Week"
              placeholder="Enter suggested hours"
              min={1}
              max={40}
              {...form.getInputProps('suggested_hours_per_week')}
              required
            />

            <Checkbox
              label="Mandatory Subject"
              description="Is this subject mandatory for this grade?"
              {...form.getInputProps('is_mandatory', { type: 'checkbox' })}
            />

            <Button type="submit" loading={loading}>
              Add Mapping
            </Button>
          </Stack>
        </form>
      </Card>

      {mappings.length === 0 ? (
        <EmptyState
          title="No mappings yet"
          description="Start by mapping subjects to grades."
        />
      ) : (
        <div className="mt-8 space-y-6">
          {mappings.map((mapping) => (
            <Card key={mapping.id} withBorder>
              <Group position="apart">
                <div>
                  <Text fw={500}>{mapping.subjects.name}</Text>
                  <Text size="sm">{mapping.grades.grade_name}</Text>
                  <Group mt="xs">
                    <Badge color={mapping.is_mandatory ? 'blue' : 'gray'}>
                      {mapping.is_mandatory ? 'Mandatory' : 'Optional'}
                    </Badge>
                    <Badge color="green">
                      {mapping.suggested_hours_per_week} hours/week
                    </Badge>
                  </Group>
                </div>
                <Button
                  variant="light"
                  color="red"
                  onClick={() => handleDelete(mapping)}
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