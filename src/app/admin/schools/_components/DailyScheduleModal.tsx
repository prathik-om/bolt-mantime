"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Title,
  Text,
  Stack,
  Group,
  Button,
  NumberInput,
  ActionIcon,
  Card,
  Badge,
  Alert,
  Divider,
  Switch,
  Tooltip,
  TextInput,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { IconPlus, IconEdit, IconTrash, IconGripVertical, IconClock, IconCoffee } from "@tabler/icons-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getBreaks, createBreak, updateBreak, deleteBreak, reorderBreaks } from "@/lib/api/breaks";
import { updateSchool } from "@/lib/api/schools";
import type { Break } from "@/lib/api/breaks";

interface DailyScheduleModalProps {
  opened: boolean;
  onClose: () => void;
  schoolId: string;
  currentSchool: {
    sessions_per_day: number;
    start_time: string;
    end_time: string;
    period_duration: number;
  };
  onSchoolUpdate?: (updatedSchool: any) => void;
}

type ScheduleItem = {
  id: string;
  type: 'session' | 'break';
  name: string;
  start_time: string;
  end_time: string;
  sequence: number;
  is_active: boolean;
  duration?: number;
};

export default function DailyScheduleModal({
  opened,
  onClose,
  schoolId,
  currentSchool,
  onSchoolUpdate,
}: DailyScheduleModalProps) {
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [sessionsPerDay, setSessionsPerDay] = useState(currentSchool.sessions_per_day || 8);
  const [periodDuration, setPeriodDuration] = useState(currentSchool.period_duration || 50);
  const [schoolStartTime, setSchoolStartTime] = useState(currentSchool.start_time || "08:00");
  const [schoolEndTime, setSchoolEndTime] = useState(currentSchool.end_time || "15:30");
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    start_time: "",
    end_time: "",
    sequence: 1,
    is_active: true,
    type: 'break' as 'session' | 'break',
  });

  useEffect(() => {
    if (opened) {
      loadBreaks();
      generateSchedule();
      setHasUnsavedChanges(false);
    }
  }, [opened, schoolId]);

  useEffect(() => {
    generateSchedule();
  }, [sessionsPerDay, periodDuration, schoolStartTime, schoolEndTime, breaks]);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = 
      sessionsPerDay !== currentSchool.sessions_per_day ||
      periodDuration !== currentSchool.period_duration ||
      schoolStartTime !== currentSchool.start_time ||
      schoolEndTime !== currentSchool.end_time;
    
    setHasUnsavedChanges(hasChanges);
  }, [sessionsPerDay, periodDuration, schoolStartTime, schoolEndTime, currentSchool]);

  const loadBreaks = async () => {
    try {
      setLoading(true);
      const data = await getBreaks(schoolId);
      setBreaks(data);
    } catch (err) {
      setError("Failed to load breaks");
    } finally {
      setLoading(false);
    }
  };

  const saveSchoolConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);

      const updatedSchool = await updateSchool(schoolId, {
        sessions_per_day: sessionsPerDay,
        period_duration: periodDuration,
        start_time: schoolStartTime,
        end_time: schoolEndTime,
      });

      if (onSchoolUpdate) {
        onSchoolUpdate(updatedSchool);
      }

      setHasUnsavedChanges(false);
    } catch (err) {
      setError("Failed to save school configuration");
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = () => {
    const items: ScheduleItem[] = [];
    const startTime = new Date(`2000-01-01T${schoolStartTime}`);
    const endTime = new Date(`2000-01-01T${schoolEndTime}`);
    // const totalMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    
    // Calculate available time for sessions (excluding breaks)
    const breakItems = breaks.filter(b => b.is_active);
    // const totalBreakTime = breakItems.reduce((sum, b) => {
    //   const breakStart = new Date(`2000-01-01T${b.start_time}`);
    //   const breakEnd = new Date(`2000-01-01T${b.end_time}`);
    //   return sum + (breakEnd.getTime() - breakStart.getTime()) / 60000;
    // }, 0);
    
    // const availableSessionTime = totalMinutes - totalBreakTime;
    // const sessionDuration = Math.floor(availableSessionTime / sessionsPerDay);
    const sessionDuration = periodDuration;

    let currentTime = new Date(startTime);
    let sessionCount = 0;
    let breakIndex = 0;

    while (sessionCount < sessionsPerDay && currentTime < endTime) {
      // Add session
      const sessionEnd = new Date(currentTime.getTime() + sessionDuration * 60000);
      if (sessionEnd <= endTime) {
        items.push({
          id: `session-${sessionCount + 1}`,
          type: 'session',
          name: `Period ${sessionCount + 1}`,
          start_time: currentTime.toTimeString().slice(0, 5),
          end_time: sessionEnd.toTimeString().slice(0, 5),
          sequence: items.length + 1,
          is_active: true,
          duration: sessionDuration,
        });
        sessionCount++;
        currentTime = new Date(sessionEnd);
      }

      // Add break if available and time permits
      if (breakIndex < breakItems.length) {
        const breakItem = breakItems[breakIndex];
        const breakStart = new Date(`2000-01-01T${breakItem.start_time}`);
        const breakEnd = new Date(`2000-01-01T${breakItem.end_time}`);
        
        if (currentTime >= breakStart && currentTime < breakEnd) {
          items.push({
            id: breakItem.id,
            type: 'break',
            name: breakItem.name,
            start_time: breakItem.start_time,
            end_time: breakItem.end_time,
            sequence: items.length + 1,
            is_active: breakItem.is_active ?? true,
          });
          currentTime = new Date(breakEnd);
          breakIndex++;
        }
      }
    }

    setScheduleItems(items);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (formData.type === 'break') {
        // Validate break times
        if (formData.start_time >= formData.end_time) {
          setError("Start time must be before end time");
          return;
        }

        const breakData = {
          school_id: schoolId,
          name: formData.name,
          start_time: formData.start_time,
          end_time: formData.end_time,
          sequence: formData.sequence,
          is_active: formData.is_active,
        };

        if (editingItem && editingItem.type === 'break') {
          await updateBreak(editingItem.id, breakData);
        } else {
          await createBreak(breakData);
        }
      }

      await loadBreaks();
      resetForm();
    } catch (err) {
      setError("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, type: 'session' | 'break') => {
    try {
      setLoading(true);
      if (type === 'break') {
        await deleteBreak(id);
        await loadBreaks();
      }
      // Sessions are generated automatically, so no deletion needed
    } catch (err) {
      setError("Failed to delete item");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ScheduleItem) => {
    if (item.type === 'break') {
      setEditingItem(item);
      setFormData({
        name: item.name,
        start_time: item.start_time,
        end_time: item.end_time,
        sequence: item.sequence,
        is_active: item.is_active,
        type: 'break',
      });
      setShowForm(true);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      start_time: "",
      end_time: "",
      sequence: 1,
      is_active: true,
      type: 'break',
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(scheduleItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setScheduleItems(items);

    // Update break sequences if needed
    const breakIds = items
      .filter(item => item.type === 'break')
      .map(item => item.id);
    
    try {
      await reorderBreaks(schoolId, breakIds);
    } catch (err) {
      setError("Failed to reorder breaks");
      await loadBreaks();
    }
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    // Parse time strings in HH:MM format
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    // Convert to total minutes
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    // Calculate difference (end - start)
    const diffMinutes = endTotalMinutes - startTotalMinutes;
    
    return diffMinutes;
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes to the school configuration. Do you want to save them before closing?")) {
        saveSchoolConfiguration().then(() => onClose());
      } else {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Daily Schedule Management"
      size="xl"
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Schedule Configuration */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Schedule Configuration</Title>
            {hasUnsavedChanges && (
              <Button 
                size="sm" 
                onClick={saveSchoolConfiguration} 
                loading={loading}
                color="green"
              >
                Save Changes
              </Button>
            )}
          </Group>
          <Group grow>
            <NumberInput
              label="Sessions per Day"
              value={sessionsPerDay}
              onChange={(value) => setSessionsPerDay(typeof value === 'number' ? value : 8)}
              min={1}
              max={12}
              required
            />
            <NumberInput
              label="Period Duration (minutes)"
              value={periodDuration}
              onChange={(value) => setPeriodDuration(typeof value === 'number' ? value : 50)}
              min={30}
              max={120}
              required
            />
          </Group>
          <Group grow mt="md">
            <TimeInput
              label="School Start Time"
              value={schoolStartTime}
              onChange={(e) => setSchoolStartTime(e.target.value)}
              required
            />
            <TimeInput
              label="School End Time"
              value={schoolEndTime}
              onChange={(e) => setSchoolEndTime(e.target.value)}
              required
            />
          </Group>
          {hasUnsavedChanges && (
            <Alert color="yellow" title="Unsaved Changes" mt="md">
              You have unsaved changes to the school configuration. Click "Save Changes" to apply them.
            </Alert>
          )}
        </Card>

        {/* Add Break Form */}
        {showForm && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              {editingItem ? "Edit Break" : "Add New Break"}
            </Title>
            <Stack gap="md">
              <TextInput
                label="Break Name"
                placeholder="e.g., Morning Recess, Lunch Break"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Group grow>
                <TimeInput
                  label="Start Time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
                <TimeInput
                  label="End Time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </Group>
              <Group justify="flex-end">
                <Button variant="light" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} loading={loading}>
                  {editingItem ? "Update" : "Create"} Break
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {/* Daily Schedule */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Daily Schedule</Title>
            {!showForm && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setShowForm(true)}
                size="sm"
              >
                Add Break
              </Button>
            )}
          </Group>

          {scheduleItems.length === 0 ? (
            <Alert color="blue" title="No Schedule">
              Configure your schedule settings above to generate the daily schedule.
            </Alert>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="schedule">
                {(provided) => (
                  <Stack gap="sm" {...provided.droppableProps} ref={provided.innerRef}>
                    {scheduleItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided) => (
                          <Card
                            shadow="sm"
                            padding="md"
                            radius="md"
                            withBorder
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <Group justify="space-between">
                              <Group>
                                <div {...provided.dragHandleProps}>
                                  <IconGripVertical size={16} color="gray" />
                                </div>
                                <div>
                                  <Group>
                                    <Text fw={500}>{item.name}</Text>
                                    <Badge 
                                      color={item.type === 'session' ? 'blue' : 'orange'} 
                                      variant="light"
                                    >
                                      {item.type === 'session' ? 'Period' : 'Break'}
                                    </Badge>
                                  </Group>
                                  <Text size="sm" c="dimmed">
                                    {item.start_time} - {item.end_time} 
                                    ({calculateDuration(item.start_time, item.end_time)} min)
                                  </Text>
                                </div>
                              </Group>
                              <Group>
                                {item.type === 'break' && (
                                  <>
                                    <Tooltip label="Edit Break">
                                      <ActionIcon
                                        variant="light"
                                        color="blue"
                                        onClick={() => handleEdit(item)}
                                      >
                                        <IconEdit size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Delete Break">
                                      <ActionIcon
                                        variant="light"
                                        color="red"
                                        onClick={() => handleDelete(item.id, item.type)}
                                      >
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </>
                                )}
                              </Group>
                            </Group>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Stack>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Card>

        <Group justify="flex-end">
          <Button onClick={handleClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
} 