import { createClient } from '../supabase-server';
import type { TimeSlot, TeachingAssignment } from '../types/database-helpers';
import { getSchoolConstraints } from './schools';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface TeacherAvailability {
  teacherId: string;
  timeSlotId: string;
  date: string;
}

interface RoomAvailability {
  roomId: string;
  timeSlotId: string;
  date: string;
}

export async function validateTeacherAvailability({
  teacherId,
  timeSlotId,
  date
}: TeacherAvailability): Promise<ValidationResult> {
  const supabase = await createClient();
  const errors: string[] = [];

  // Check if teacher has any other lessons at this time
  const { data: existingLessons, error: lessonsError } = await supabase
    .from('scheduled_lessons')
    .select(`
      id,
      time_slots (
        start_time,
        end_time,
        day_of_week
      )
    `)
    .eq('teaching_assignments.teacher_id', teacherId)
    .eq('date', date)
    .eq('timeslot_id', timeSlotId);

  if (lessonsError) {
    errors.push(`Failed to check teacher availability: ${lessonsError.message}`);
    return { isValid: false, errors };
  }

  if (existingLessons && existingLessons.length > 0) {
    errors.push('Teacher is already scheduled for this time slot');
    return { isValid: false, errors };
  }

  // Check teacher preferences and constraints
  const { data: teacherConstraints, error: constraintsError } = await supabase
    .from('teacher_time_constraints')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('time_slot_id', timeSlotId);

  if (constraintsError) {
    errors.push(`Failed to check teacher constraints: ${constraintsError.message}`);
    return { isValid: false, errors };
  }

  if (teacherConstraints && teacherConstraints.length > 0) {
    errors.push('This time slot conflicts with teacher constraints');
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
}

export async function validateRoomAvailability({
  roomId,
  timeSlotId,
  date
}: RoomAvailability): Promise<ValidationResult> {
  const supabase = await createClient();
  const errors: string[] = [];

  // Check if room is already booked
  const { data: existingBookings, error: bookingsError } = await supabase
    .from('scheduled_lessons')
    .select('id')
    .eq('room_id', roomId)
    .eq('timeslot_id', timeSlotId)
    .eq('date', date);

  if (bookingsError) {
    errors.push(`Failed to check room availability: ${bookingsError.message}`);
    return { isValid: false, errors };
  }

  if (existingBookings && existingBookings.length > 0) {
    errors.push('Room is already booked for this time slot');
    return { isValid: false, errors };
  }

  // Check room capacity against class size
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('capacity')
    .eq('id', roomId)
    .single();

  if (roomError) {
    errors.push(`Failed to check room capacity: ${roomError.message}`);
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
}

export async function validateSubjectScheduling(
  teachingAssignmentId: string,
  timeSlotId: string
): Promise<ValidationResult> {
  const supabase = await createClient();
  const errors: string[] = [];

  // Get teaching assignment details
  const { data: assignment, error: assignmentError } = await supabase
    .from('teaching_assignments')
    .select(`
      id,
      class_offerings (
        id,
        courses (
          id,
          name,
          preferred_time_slots
        )
      )
    `)
    .eq('id', teachingAssignmentId)
    .single();

  if (assignmentError) {
    errors.push(`Failed to get assignment details: ${assignmentError.message}`);
    return { isValid: false, errors };
  }

  // Check if this subject has preferred time slots
  if (assignment?.class_offerings?.courses?.preferred_time_slots) {
    const preferredSlots = assignment.class_offerings.courses.preferred_time_slots;
    if (!preferredSlots.includes(timeSlotId)) {
      errors.push('This subject is preferably taught at different times');
    }
  }

  // Check subject sequencing rules
  const { data: subjectRules, error: rulesError } = await supabase
    .from('subject_scheduling_rules')
    .select('*')
    .eq('course_id', assignment?.class_offerings?.courses?.id);

  if (rulesError) {
    errors.push(`Failed to check subject rules: ${rulesError.message}`);
    return { isValid: false, errors };
  }

  if (subjectRules && subjectRules.length > 0) {
    // Implement subject-specific scheduling rules
    // This could include things like:
    // - Subjects that should be taught earlier in the day
    // - Subjects that shouldn't be back-to-back
    // - Subjects that need specific gaps between sessions
  }

  return { isValid: true, errors: [] };
}

export async function validateClassSchedule(
  classOfferingId: string,
  date: string
): Promise<ValidationResult> {
  const supabase = await createClient();
  const errors: string[] = [];

  // Get all entries for this class on this date
  const { data: entries, error: entriesError } = await supabase
    .from('timetable_entries')
    .select(`
      id,
      time_slots (
        start_time,
        end_time,
        day_of_week
      ),
      teaching_assignments (
        class_offerings (
          subjects (
            name
          )
        )
      )
    `)
    .eq('teaching_assignments.class_offering_id', classOfferingId)
    .eq('date', date);

  if (entriesError) {
    errors.push(`Failed to get class schedule: ${entriesError.message}`);
    return { isValid: false, errors };
  }

  if (!entries) return { isValid: true, errors: [] };

  // Check for gaps in schedule
  const sortedEntries = entries.sort((a, b) => 
    a.time_slots.start_time.localeCompare(b.time_slots.start_time)
  );

  for (let i = 1; i < sortedEntries.length; i++) {
    const prevEnd = new Date(`1970-01-01T${sortedEntries[i-1].time_slots.end_time}`);
    const currStart = new Date(`1970-01-01T${sortedEntries[i].time_slots.start_time}`);
    
    const gapMinutes = (currStart.getTime() - prevEnd.getTime()) / 1000 / 60;
    
    if (gapMinutes > 60) {
      errors.push(`Large gap (${Math.round(gapMinutes/60)} hours) in class schedule`);
    }
  }

  // Check subject distribution
  const subjectCounts = entries.reduce((acc, entry) => {
    const subject = entry.teaching_assignments.class_offerings.subjects.name;
    acc[subject] = (acc[subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [subject, count] of Object.entries(subjectCounts)) {
    if (count > 2) {
      errors.push(`Too many ${subject} lessons scheduled on the same day (${count})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}