"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Table,
  Modal,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Badge,
  ActionIcon,
  Tooltip,
  Alert,
  Paper,
  ThemeIcon,
  Accordion,
  AccordionItem,
  AccordionControl,
  AccordionPanel,
  AccordionChevron,
  Grid,
  Checkbox,
  Switch,
  Divider,
  Box,
  RingProgress,
  Progress,
  List,
  ListItem,
  Chip,
  MultiSelect,
  SegmentedControl,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconClock,
  IconUser,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconCalendar,
  IconSettings,
  IconBrain,
  IconUsers,
  IconFilter,
  IconSearch,
  IconDownload,
  IconUpload,
  IconCopy,
  IconTemplate,
  IconGauge,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createClient } from '@/utils/supabase/client';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  max_periods_per_week: number | null;
}

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  period_number: number | null;
  is_teaching_period: boolean | null;
}

interface TeacherConstraint {
  id: string;
  teacher_id: string;
  time_slot_id: string;
  constraint_type: string;
  reason: string | null;
  priority: number | null;
  teachers: {
    first_name: string;
    last_name: string;
  };
  time_slots: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  };
}

interface Props {
  schoolId: string;
  teachers: Teacher[];
  timeSlots: TimeSlot[];
  teacherConstraints: TeacherConstraint[];
}

// Helper functions for day conversion
const dayToNumber: { [key: string]: number } = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

const numberToDay: { [key: number]: string } = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

const getDayName = (day: number | string): string => {
  if (typeof day === 'number') {
    return numberToDay[day]?.charAt(0).toUpperCase() + numberToDay[day]?.slice(1) || 'Unknown';
  }
  return day.charAt(0).toUpperCase() + day.slice(1);
};

export default function TeacherConstraintsTab({ schoolId, teachers, timeSlots, teacherConstraints }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<TeacherConstraint | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'calendar' | 'teacher'>('table');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const supabase = createClient();

  // Filter to only show unavailable constraints (hard constraints supported by solver)
  const availableConstraints = useMemo(() => 
    teacherConstraints.filter(c => c.constraint_type === 'unavailable'),
    [teacherConstraints]
  );

  const form = useForm({
    initialValues: {
      teacher_id: '',
      time_slot_id: '',
      constraint_type: 'unavailable' as 'unavailable',
      reason: '',
    },
    validate: {
      teacher_id: (value) => (!value ? 'Teacher is required' : null),
      time_slot_id: (value) => (!value ? 'Time slot is required' : null),
    },
  });

  // Filter constraints based on selected filters (only unavailable constraints)
  const filteredConstraints = useMemo(() => 
    availableConstraints.filter(constraint => {
      if (filterTeacher !== 'all' && constraint.teacher_id !== filterTeacher) return false;
      if (filterDay !== 'all' && constraint.time_slots.day_of_week !== dayToNumber[filterDay]) return false;
      return true;
    }),
    [availableConstraints, filterTeacher, filterDay]
  );

  // Group constraints by teacher for calendar view
  const constraintsByTeacher = useMemo(() => 
    teachers.map(teacher => ({
      teacher,
      constraints: availableConstraints.filter(c => c.teacher_id === teacher.id)
    })),
    [teachers, availableConstraints]
  );

  const openAddModal = useCallback(() => {
    setEditingConstraint(null);
    form.reset();
    setModalOpen(true);
  }, [form]);

  const openEditModal = useCallback((constraint: TeacherConstraint) => {
    setEditingConstraint(constraint);
    form.setValues({
      teacher_id: constraint.teacher_id,
      time_slot_id: constraint.time_slot_id,
      constraint_type: 'unavailable',
      reason: constraint.reason || '',
    });
    setModalOpen(true);
  }, [form]);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      if (editingConstraint) {
        // Update existing constraint
        const { error } = await supabase
          .from('teacher_time_constraints')
          .update({
            teacher_id: values.teacher_id,
            time_slot_id: values.time_slot_id,
            constraint_type: 'unavailable',
            reason: values.reason || null,
          })
          .eq('id', editingConstraint.id);

        if (error) throw error;
        notifications.show({ title: 'Success', message: 'Constraint updated successfully', color: 'green' });
      } else {
        // Add new constraint
        const { error } = await supabase
          .from('teacher_time_constraints')
          .insert({
            teacher_id: values.teacher_id,
            time_slot_id: values.time_slot_id,
            constraint_type: 'unavailable',
            reason: values.reason || null,
          });

        if (error) throw error;
        notifications.show({ title: 'Success', message: 'Constraint added successfully', color: 'green' });
      }
      
      setModalOpen(false);
      // Refresh the page to get updated data
      window.location.reload();
    } catch (error: any) {
      console.error('Error saving constraint:', error);
      notifications.show({ 
        title: 'Error', 
        message: error.message || 'Failed to save constraint', 
        color: 'red' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (constraintId: string) => {
    if (!confirm('Are you sure you want to delete this constraint?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('teacher_time_constraints')
        .delete()
        .eq('id', constraintId);

      if (error) throw error;
      notifications.show({ title: 'Success', message: 'Constraint deleted successfully', color: 'green' });
      // Refresh the page to get updated data
      window.location.reload();
    } catch (error: any) {
      console.error('Error deleting constraint:', error);
      notifications.show({ 
        title: 'Error', 
        message: error.message || 'Failed to delete constraint', 
        color: 'red' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = useCallback((value: string) => {
    setViewMode(value as 'table' | 'calendar' | 'teacher');
  }, []);

  const handleFilterTeacherChange = useCallback((value: string | null) => {
    setFilterTeacher(value || 'all');
  }, []);

  const handleFilterDayChange = useCallback((value: string | null) => {
    setFilterDay(value || 'all');
  }, []);

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Teacher Unavailability</Title>
          <Text c="dimmed" size="sm">
            Manage teacher time constraints for unavailable periods
          </Text>
        </div>
        <Button 
          leftSection={<IconPlus size={16} />}
          onClick={openAddModal}
        >
          Add Constraint
        </Button>
      </Group>

      {/* Info Alert */}
      <Alert icon={<IconInfoCircle size={16} />} color="blue">
        <Text size="sm">
          <strong>Note:</strong> Only hard constraints (unavailable times) are currently supported by the solver. 
          Soft preferences and priorities will be added in the next phase.
        </Text>
      </Alert>

      {/* Filters and View Controls */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Filters & View</Title>
          <SegmentedControl
            value={viewMode}
            onChange={handleViewModeChange}
            data={[
              { label: 'Table View', value: 'table' },
              { label: 'Calendar View', value: 'calendar' },
              { label: 'Teacher View', value: 'teacher' },
            ]}
          />
        </Group>

        <Grid>
          <Grid.Col span={6}>
            <Select
              label="Filter by Teacher"
              placeholder="All teachers"
              data={[
                { value: 'all', label: 'All Teachers' },
                ...teachers.map(t => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }))
              ]}
              value={filterTeacher}
              onChange={handleFilterTeacherChange}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Filter by Day"
              placeholder="All days"
              data={[
                { value: 'all', label: 'All Days' },
                { value: 'monday', label: 'Monday' },
                { value: 'tuesday', label: 'Tuesday' },
                { value: 'wednesday', label: 'Wednesday' },
                { value: 'thursday', label: 'Thursday' },
                { value: 'friday', label: 'Friday' },
              ]}
              value={filterDay}
              onChange={handleFilterDayChange}
            />
          </Grid.Col>
        </Grid>
        <Group mt="md">
          <Text size="sm" fw={500}>Results:</Text>
          <Badge size="lg" variant="light">
            {filteredConstraints.length} unavailable time slots
          </Badge>
        </Group>
      </Card>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card withBorder>
          <Title order={3} mb="md">Teacher Unavailability</Title>
          {filteredConstraints.length > 0 ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Teacher</Table.Th>
                  <Table.Th>Day & Time</Table.Th>
                  <Table.Th>Reason</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredConstraints.map((constraint) => (
                  <Table.Tr key={constraint.id}>
                    <Table.Td>
                      <Text fw={500}>
                        {constraint.teachers.first_name} {constraint.teachers.last_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {getDayName(constraint.time_slots.day_of_week)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {constraint.time_slots.start_time} - {constraint.time_slots.end_time}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" style={{ maxWidth: 200 }}>
                        {constraint.reason || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Edit">
                          <ActionIcon 
                            size="sm" 
                            variant="light" 
                            onClick={() => openEditModal(constraint)}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon 
                            size="sm" 
                            variant="light" 
                            color="red"
                            onClick={() => handleDelete(constraint.id)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Alert icon={<IconAlertTriangle size={16} />} color="blue">
              No unavailability constraints found matching the current filters.
            </Alert>
          )}
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card withBorder>
          <Title order={3} mb="md">Weekly Calendar View</Title>
          <Grid>
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
              <Grid.Col span={2.4} key={day}>
                <Paper p="md" withBorder>
                  <Text fw={500} mb="sm" ta="center">
                    {getDayName(day)}
                  </Text>
                  <Stack gap="xs">
                    {timeSlots
                      .filter(slot => slot.day_of_week === dayToNumber[day])
                      .map(slot => {
                        const constraint = filteredConstraints.find(
                          c => c.time_slot_id === slot.id
                        );
                        return (
                          <Paper 
                            key={slot.id} 
                            p="xs" 
                            withBorder 
                            style={{ 
                              backgroundColor: constraint 
                                ? '#fff5f5'  // Red background for unavailable
                                : '#f8fafc'  // Light gray for available
                            }}
                          >
                            <Text size="xs" fw={500}>
                              {slot.start_time}
                            </Text>
                            {constraint && (
                              <Text size="xs" c="dimmed">
                                {constraint.teachers.first_name} {constraint.teachers.last_name.charAt(0)}.
                              </Text>
                            )}
                          </Paper>
                        );
                      })}
                  </Stack>
                </Paper>
              </Grid.Col>
            ))}
          </Grid>
        </Card>
      )}

      {/* Teacher View */}
      {viewMode === 'teacher' && (
        <Card withBorder>
          <Title order={3} mb="md">Teacher Overview</Title>
          <Accordion>
            {constraintsByTeacher.map(({ teacher, constraints }) => (
              <AccordionItem key={teacher.id} value={teacher.id}>
                <AccordionControl>
                  <Group justify="space-between">
                    <Text fw={500}>
                      {teacher.first_name} {teacher.last_name}
                    </Text>
                    <Group gap="xs">
                      <Badge variant="light">
                        {constraints.length} unavailable slots
                      </Badge>
                      <Badge 
                        color={constraints.length > 0 ? 'red' : 'green'}
                        variant="light"
                      >
                        {constraints.length > 0 ? 'Has unavailability' : 'Fully available'}
                      </Badge>
                    </Group>
                  </Group>
                </AccordionControl>
                <AccordionPanel>
                  {constraints.length > 0 ? (
                    <List>
                      {constraints.map(constraint => (
                        <ListItem key={constraint.id}>
                          <Text size="sm">
                            <strong>{getDayName(constraint.time_slots.day_of_week)}</strong> at{' '}
                            {constraint.time_slots.start_time} - {constraint.time_slots.end_time}
                            {constraint.reason && (
                              <Text size="xs" c="dimmed" mt={4}>
                                Reason: {constraint.reason}
                              </Text>
                            )}
                          </Text>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No unavailability constraints set for this teacher.
                    </Text>
                  )}
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal 
        opened={modalOpen} 
        onClose={() => setModalOpen(false)}
        title={editingConstraint ? 'Edit Constraint' : 'Add Constraint'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Select
              label="Teacher"
              placeholder="Select a teacher"
              data={teachers.map(t => ({ 
                value: t.id, 
                label: `${t.first_name} ${t.last_name}` 
              }))}
              {...form.getInputProps('teacher_id')}
              required
            />

            <Select
              label="Time Slot"
              placeholder="Select a time slot"
              data={timeSlots.map(slot => ({ 
                value: slot.id, 
                label: `${getDayName(slot.day_of_week)} ${slot.start_time} - ${slot.end_time}` 
              }))}
              {...form.getInputProps('time_slot_id')}
              required
            />

            <Textarea
              label="Reason (Optional)"
              placeholder="Why is this time unavailable?"
              {...form.getInputProps('reason')}
              rows={3}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {editingConstraint ? 'Update' : 'Add'} Constraint
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
} 