'use client';

import { useState } from 'react';
import {
  Stack,
  Select,
  Button,
  Text,
  Alert,
  Group,
  Card,
  Badge,
  Textarea,
  Switch,
  Grid
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/lib/database.types';
import {
  IconAlertCircle,
  IconCircleCheck,
  IconBrain
} from '@tabler/icons-react';

type TeachingAssignment = Database['public']['Tables']['teaching_assignments']['Row'];
type Teacher = Database['public']['Tables']['teachers']['Row'];
type ClassOffering = Database['public']['Tables']['class_offerings']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];
type Class = Database['public']['Tables']['classes']['Row'];

interface ExtendedTeachingAssignment extends TeachingAssignment {
  teacher: Teacher;
  class_offering: ClassOffering & {
    course: Course;
    class: Class;
  };
}

interface TeacherAssignmentFormProps {
  assignment?: ExtendedTeachingAssignment | null;
  onSuccess: () => void;
  onCancel: () => void;
  schoolId: string;
}

export default function TeacherAssignmentForm({
  assignment,
  onSuccess,
  onCancel,
  schoolId
}: TeacherAssignmentFormProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const form = useForm({
    initialValues: {
      teacher_id: assignment?.teacher_id || '',
      class_offering_id: assignment?.class_offering_id || '',
      assignment_type: assignment?.assignment_type || 'manual',
      notes: '',
      is_active: true
    },
    validate: {
      teacher_id: (value) => (!value ? 'Teacher is required' : null),
      class_offering_id: (value) => (!value ? 'Class offering is required' : null),
    }
  });

  // Fetch class offerings
  const { data: classOfferings, isLoading: classOfferingsLoading, error: classOfferingsError } = useQuery({
    queryKey: ['class-offerings', schoolId],
    queryFn: async (): Promise<ClassOffering[]> => {
      console.log('Fetching class offerings for school:', schoolId);
      const { data, error } = await supabase
        .from('class_offerings')
        .select(`
          *,
          course:courses!inner(name, code, school_id),
          class:classes!inner(name, grade_level, school_id)
        `)
        .eq('course.school_id', schoolId)
        .eq('class.school_id', schoolId);

      if (error) {
        console.error('Error fetching class offerings:', error);
        throw error;
      }
      
      console.log('Class offerings fetched:', data);
      return data || [];
    },
    enabled: !!schoolId
  });

  // Fetch teachers
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async (): Promise<Teacher[]> => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_id', schoolId)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId
  });

  // Create/Update assignment mutation
  const mutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      if (assignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('teaching_assignments')
          .update({
            teacher_id: values.teacher_id,
            class_offering_id: values.class_offering_id,
            assignment_type: values.assignment_type
          })
          .eq('id', assignment.id);
        
        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('teaching_assignments')
          .insert({
            teacher_id: values.teacher_id,
            class_offering_id: values.class_offering_id,
            assignment_type: values.assignment_type,
            school_id: schoolId
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-workloads'] });
      notifications.show({
        title: 'Success',
        message: assignment ? 'Assignment updated successfully' : 'Assignment created successfully',
        color: 'green',
        icon: <IconCircleCheck size={16} />
      });
      onSuccess();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: 'Failed to save assignment',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      });
    }
  });

  const handleSubmit = form.onSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="lg">
        {/* Class Offering Selection */}
        <Card withBorder>
          <Text fw={500} mb="md">Class Offering</Text>
          {classOfferingsError && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Error loading class offerings"
              color="red"
              mb="md"
            >
              {classOfferingsError.message}
            </Alert>
          )}
          <Select
            label="Class Offering"
            placeholder={classOfferingsLoading ? "Loading..." : "Select class offering"}
            data={classOfferings?.map(co => ({
              value: co.id,
              label: `${co.course?.name || 'Unknown Course'} - ${co.class?.name || 'Unknown Class'} (Grade ${co.class?.grade_level || 'N/A'}) - ${co.periods_per_week} periods/week`
            })) || []}
            value={form.values.class_offering_id}
            onChange={(value) => form.setFieldValue('class_offering_id', value || '')}
            error={form.errors.class_offering_id}
            disabled={classOfferingsLoading}
            required
          />
          {classOfferings?.length === 0 && !classOfferingsLoading && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="No class offerings available"
              color="blue"
              mt="md"
            >
              No class offerings found for this school. Please create class offerings first.
            </Alert>
          )}
        </Card>

        {/* Teacher Selection */}
        <Card withBorder>
          <Text fw={500} mb="md">Teacher</Text>
          <Select
            label="Teacher"
            placeholder={teachersLoading ? "Loading..." : "Select teacher"}
            data={teachers?.map(teacher => ({
              value: teacher.id,
              label: `${teacher.first_name} ${teacher.last_name} (${teacher.email})`
            })) || []}
            value={form.values.teacher_id}
            onChange={(value) => form.setFieldValue('teacher_id', value || '')}
            error={form.errors.teacher_id}
            disabled={teachersLoading}
            required
          />
          {teachers?.length === 0 && !teachersLoading && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="No teachers available"
              color="blue"
              mt="md"
            >
              No teachers found for this school. Please add teachers first.
            </Alert>
          )}
        </Card>

        {/* Assignment Type Selection */}
        <Card withBorder>
          <Text fw={500} mb="md">Assignment Type</Text>
          <Select
            label="Assignment Type"
            placeholder="Select assignment type"
            data={[
              { value: 'manual', label: 'Manual Assignment' },
              { value: 'ai', label: 'AI-Assigned' }
            ]}
            value={form.values.assignment_type}
            onChange={(value) => form.setFieldValue('assignment_type', value || 'manual')}
            description={
              form.values.assignment_type === 'manual' 
                ? 'Manually assigned by administrator'
                : 'Assigned by AI algorithm based on workload and qualifications'
            }
            required
          />
        </Card>

        {/* Additional Options */}
        <Card withBorder>
          <Text fw={500} mb="md">Additional Options</Text>
          <Textarea
            label="Notes"
            placeholder="Optional notes about this assignment"
            value={form.values.notes}
            onChange={(event) => form.setFieldValue('notes', event.currentTarget.value)}
            rows={3}
          />
          <Switch
            label="Active Assignment"
            checked={form.values.is_active}
            onChange={(event) => form.setFieldValue('is_active', event.currentTarget.checked)}
            mt="md"
          />
        </Card>

        {/* AI Suggestions */}
        {classOfferings && teachers && (
          <Card withBorder>
            <Text fw={500} mb="md">AI Suggestions</Text>
            <Text size="sm" c="dimmed" mb="md">
              Based on teacher workload and qualifications
            </Text>
            
            {form.values.class_offering_id && (
              <Button
                variant="light"
                color="blue"
                fullWidth
                onClick={() => {
                  // TODO: Implement AI suggestion logic
                  const suggestedTeacher = teachers.find(t => 
                    t.school_id === schoolId && 
                    t.id !== form.values.teacher_id
                  );
                  if (suggestedTeacher) {
                    form.setFieldValue('teacher_id', suggestedTeacher.id);
                    form.setFieldValue('assignment_type', 'ai');
                    notifications.show({
                      title: 'AI Suggestion Applied',
                      message: `Suggested: ${suggestedTeacher.first_name} ${suggestedTeacher.last_name}`,
                      color: 'blue',
                      icon: <IconBrain size={16} />
                    });
                  }
                }}
                leftSection={<IconBrain size={16} />}
              >
                Get AI Suggestion
              </Button>
            )}
            
            {!form.values.class_offering_id && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Select a class offering first"
                color="blue"
              >
                Choose a class offering to get AI-powered teacher suggestions.
              </Alert>
            )}
          </Card>
        )}

        {/* Form Actions */}
        <Group justify="flex-end">
          <Button
            variant="light"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={!form.values.teacher_id || !form.values.class_offering_id}
          >
            {assignment ? 'Update Assignment' : 'Create Assignment'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
