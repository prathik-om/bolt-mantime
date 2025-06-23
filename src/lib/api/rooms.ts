import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/lib/database.types'
import { Tables, TablesInsert } from "@/types/database";

type Room = Database['public']['Tables']['rooms']['Row']
type RoomInsert = Database['public']['Tables']['rooms']['Insert']
type RoomUpdate = Database['public']['Tables']['rooms']['Update']

export async function getRooms(schoolId: string): Promise<Tables<'rooms'>[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch rooms: ${error.message}`);
  }

  return data || [];
}

export async function getRoom(id: string): Promise<Tables<'rooms'> | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch room: ${error.message}`);
  }

  return data;
}

export async function createRoom(roomData: Omit<TablesInsert<'rooms'>, 'id' | 'created_at' | 'school_id'>, schoolId: string): Promise<Tables<'rooms'>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .insert({ ...roomData, school_id: schoolId })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create room: ${error.message}`);
  }

  return data;
}

export async function updateRoom(id: string, roomData: Partial<Tables<'rooms'>>): Promise<Tables<'rooms'>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .update(roomData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update room: ${error.message}`);
  }

  return data;
}

export async function deleteRoom(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete room: ${error.message}`);
  }
}

export async function getRoomsByType(schoolId: string, roomType: string): Promise<Tables<'rooms'>[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('school_id', schoolId)
    .eq('room_type', roomType)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch rooms by type: ${error.message}`);
  }

  return data || [];
}

export async function getAvailableRooms(schoolId: string, timeSlotId: string, date: string): Promise<Tables<'rooms'>[]> {
  // This would need to check for conflicts with existing timetable entries
  // For now, returning all available rooms
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch available rooms: ${error.message}`);
  }

  return data || [];
} 