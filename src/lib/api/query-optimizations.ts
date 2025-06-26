import { createClient } from '../supabase-server';
import type { TimeSlot, TeachingAssignment } from '../types/database-helpers';

interface TeacherSchedule {
  teacherId: string;
  startDate: string;
  endDate: string;
}

interface ClassSchedule {
  classOfferingId: string;
  startDate: string;
  endDate: string;
}

interface RoomSchedule {
  roomId: string;
  startDate: string;
  endDate: string;
}

/**
 * Optimized query to get a teacher's schedule for a date range
 * Uses a single query with proper joins and indexes
 */
export async function getTeacherSchedule({
  teacherId,
  startDate,
  endDate
}: TeacherSchedule) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('teaching_assignments')
    .select(`
      id,
      timetable_entries!inner (
        id,
        date,
        time_slots (
          id,
          day_of_week,
          start_time,
          end_time
        )
      ),
      class_offerings!inner (
        id,
        classes (
          id,
          name,
          grade_level
        ),
        subjects (
          id,
          name,
          code
        )
      )
    `)
    .eq('teacher_id', teacherId)
    .gte('timetable_entries.date', startDate)
    .lte('timetable_entries.date', endDate)
    .order('timetable_entries.date', { ascending: true })
    .order('timetable_entries.time_slots.start_time', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Optimized query to get a class's schedule for a date range
 * Uses a materialized view for better performance
 */
export async function getClassSchedule({
  classOfferingId,
  startDate,
  endDate
}: ClassSchedule) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('class_schedules_view') // This would be a materialized view
    .select(`
      date,
      time_slot:time_slots (
        id,
        day_of_week,
        start_time,
        end_time
      ),
      teacher:teachers (
        id,
        first_name,
        last_name
      ),
      subject:subjects (
        id,
        name,
        code
      ),
      room:rooms (
        id,
        name,
        building
      )
    `)
    .eq('class_offering_id', classOfferingId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time_slots(start_time)', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Optimized query to get a room's schedule for a date range
 * Uses a single query with proper joins
 */
export async function getRoomSchedule({
  roomId,
  startDate,
  endDate
}: RoomSchedule) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('timetable_entries')
    .select(`
      id,
      date,
      time_slots!inner (
        id,
        day_of_week,
        start_time,
        end_time
      ),
      teaching_assignments!inner (
        id,
        teacher:teachers (
          id,
          first_name,
          last_name
        ),
        class_offering:class_offerings (
          id,
          classes (
            id,
            name,
            grade_level
          ),
          subjects (
            id,
            name,
            code
          )
        )
      )
    `)
    .eq('room_id', roomId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time_slots.start_time', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Optimized query to check for scheduling conflicts
 * Uses a single query with EXISTS clause
 */
export async function checkSchedulingConflicts(
  teacherId: string,
  timeSlotId: string,
  date: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('check_scheduling_conflicts', {
      p_teacher_id: teacherId,
      p_timeslot_id: timeSlotId,
      p_date: date
    });

  if (error) throw error;
  return data;
}

/**
 * Optimized query to get available rooms for a time slot
 * Uses a materialized view and proper indexing
 */
export async function getAvailableRooms(
  timeSlotId: string,
  date: string,
  minCapacity?: number
) {
  const supabase = await createClient();

  let query = supabase
    .from('available_rooms_view') // This would be a materialized view
    .select('*')
    .eq('time_slot_id', timeSlotId)
    .eq('date', date);

  if (minCapacity) {
    query = query.gte('capacity', minCapacity);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Optimized query to get teacher availability
 * Uses a materialized view for complex calculations
 */
export async function getTeacherAvailability(
  teacherId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('teacher_availability_view') // This would be a materialized view
    .select('*')
    .eq('teacher_id', teacherId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  return data;
}

/**
 * Optimized query to get class conflicts
 * Uses a stored procedure for complex logic
 */
export async function getClassConflicts(
  classOfferingId: string,
  timeSlotId: string,
  date: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('get_class_conflicts', {
      p_class_offering_id: classOfferingId,
      p_timeslot_id: timeSlotId,
      p_date: date
    });

  if (error) throw error;
  return data;
} 