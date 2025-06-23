'use client';

import { useState } from 'react';
import { Card, Button, Table, Modal, TextInput, Group, Stack, ActionIcon, Tooltip, Select, Text, Badge, Center, ThemeIcon } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconPlus, IconEdit, IconTrash, IconBuilding } from "@tabler/icons-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient, handleSupabaseError } from "@/utils/supabase";
import type { Tables } from "@/types/database";

export interface Room {
  id: string;
  name: string;
  room_type: string;
  capacity: number | null;
  school_id: string;
}

interface RoomsClientUIProps {
  initialRooms: Room[];
  schoolId: string;
}

const RoomsClientUI: React.FC<RoomsClientUIProps> = ({ 
  initialRooms, 
  schoolId 
}) => {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Room | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm({
    initialValues: {
      name: "",
      room_type: "classroom",
      capacity: "",
    },
    validate: {
      name: (value) => (!value ? "Room name is required" : null),
      room_type: (value) => (!value ? "Room type is required" : null),
    },
  });

  const roomTypeOptions = [
    { value: "classroom", label: "Classroom" },
    { value: "laboratory", label: "Laboratory" },
    { value: "computer_lab", label: "Computer Lab" },
    { value: "gym", label: "Gym" },
    { value: "art_room", label: "Art Room" },
    { value: "music_room", label: "Music Room" },
    { value: "library", label: "Library" },
    { value: "auditorium", label: "Auditorium" },
  ];

  // Function to refresh rooms data
  const refreshData = async () => {
    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .eq("school_id", schoolId)
        .order("name");
      
      if (roomsError) throw roomsError;
      
      if (roomsData) {
        setRooms(roomsData);
      }
    } catch (error) {
      console.error("Error refreshing rooms:", error);
      toast.error(handleSupabaseError(error));
    }
  };

  const openAddModal = () => {
    setEditingRoom(null);
    form.reset();
    setModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    form.setValues({
      name: room.name,
      room_type: room.room_type,
      capacity: room.capacity ? room.capacity.toString() : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const roomData = {
        name: values.name,
        room_type: values.room_type,
        capacity: values.capacity ? parseInt(values.capacity, 10) : null,
        school_id: schoolId,
      };

      if (editingRoom) {
        const { error } = await supabase
          .from("rooms")
          .update(roomData)
          .eq("id", editingRoom.id);
        if (error) throw error;
        toast.success("Room updated successfully!");
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert(roomData);
        if (error) throw error;
        toast.success("Room created successfully!");
      }

      setModalOpen(false);
      await refreshData();
      router.refresh();
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", confirmDelete.id);
      
      if (error) throw error;
      
      toast.success("Room deleted successfully!");
      setConfirmDelete(null);
      await refreshData();
      router.refresh();
    } catch (error: any) {
      console.error("Error in handleDelete:", error);
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  const getRoomTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      classroom: "blue",
      laboratory: "yellow",
      computer_lab: "green",
      gym: "red",
      art_room: "purple",
      music_room: "teal",
      library: "gray",
      auditorium: "orange",
    };
    return colors[type] || "gray";
  };

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <IconBuilding size={20} />
            <Text size="xl" fw={600}>Rooms</Text>
            <Badge variant="light" color="blue">{rooms.length} rooms</Badge>
          </Group>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={openAddModal}
          >
            Add Room
          </Button>
        </Group>

        {rooms.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="sm">
              <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                <IconBuilding size={48} />
              </ThemeIcon>
              <Text c="dimmed" size="sm">No rooms found</Text>
              <Text c="dimmed" size="xs">Create your first room to get started</Text>
            </Stack>
          </Center>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Room Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Capacity</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rooms.map((room) => (
                <Table.Tr key={room.id}>
                  <Table.Td>
                    <Text fw={500}>{room.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={getRoomTypeColor(room.room_type)}>
                      {room.room_type.replace('_', ' ')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {room.capacity || 'N/A'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Edit room">
                        <ActionIcon 
                          color="blue" 
                          variant="light" 
                          onClick={() => openEditModal(room)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete room">
                        <ActionIcon 
                          color="red" 
                          variant="light" 
                          onClick={() => setConfirmDelete(room)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Room Modal */}
      <Modal 
        opened={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingRoom ? "Edit Room" : "Add Room"}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            <TextInput 
              label="Room Name" 
              placeholder="e.g., Room 101"
              {...form.getInputProps('name')}
              required
            />
            
            <Select
              label="Room Type"
              placeholder="Select room type"
              data={roomTypeOptions}
              {...form.getInputProps('room_type')}
              required
            />
            
            <Group grow>
              <TextInput
                label="Capacity"
                placeholder="e.g., 30"
                type="number"
                min={1}
                {...form.getInputProps('capacity')}
              />
            </Group>
            
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={loading}>
                {editingRoom ? 'Update' : 'Create'} Room
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        opened={!!confirmDelete} 
        onClose={() => setConfirmDelete(null)} 
        title="Confirm Delete"
        size="sm"
      >
        <Stack gap="lg">
          <Text>
            Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This action cannot be undone.
          </Text>
          
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button color="red" onClick={handleDelete} loading={loading}>
              Delete Room
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default RoomsClientUI; 