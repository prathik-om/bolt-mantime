import { createClient } from '../supabase-server';
import { getSchoolConstraints, type SchoolConstraints } from './schools';
import { validateTimetableAgainstConstraints, validateScheduledLesson } from './timetable-ai-service';
import type { TimeSlot, TeachingAssignment, ClassOffering } from '../types/database-helpers';

interface GenerationOptions {
  termId: string;
  schoolId: string;
  departmentId?: string;
  gradeLevel?: number;
}

interface GenerationResult {
  success: boolean;
  errors: string[];
  timetableId?: string;
  lessonsScheduled?: number;
  totalLessonsNeeded?: number;
}

export async function generateTimetable(options: GenerationOptions): Promise<GenerationResult> {
  const supabase = await createClient();
  const constraints = await getSchoolConstraints(options.schoolId);
  
  try {
    // Start a new timetable generation
    const { data: timetable, error: timetableError } = await supabase
      .from('timetable_generations')
      .insert({
        term_id: options.termId,
        status: 'generating',
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (timetableError) throw timetableError;

    // Get all teaching assignments that need scheduling
    const { data: assignments, error: assignmentsError } = await supabase
      .from('teaching_assignments')
      .select(`
        id,
        teacher_id,
        class_offering_id,
        class_offerings (
          periods_per_week,
          term_id,
          classes (
            grade_level
          ),
          courses (
            department_id
          )
        )
      `)
      .eq('class_offerings.term_id', options.termId);

    if (assignmentsError) throw assignmentsError;

    // Filter assignments based on options
    const filteredAssignments = assignments.filter(assignment => {
      if (options.departmentId && assignment.class_offerings.courses.department_id !== options.departmentId) {
        return false;
      }
      if (options.gradeLevel && assignment.class_offerings.classes.grade_level !== options.gradeLevel) {
        return false;
      }
      return true;
    });

    // Get available time slots
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('school_id', options.schoolId)
      .eq('is_teaching_period', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (timeSlotsError) throw timeSlotsError;

    // Schedule lessons for each assignment
    let totalScheduled = 0;
    const errors: string[] = [];
    const totalNeeded = filteredAssignments.reduce(
      (sum, a) => sum + (a.class_offerings?.periods_per_week || 0),
      0
    );

    for (const assignment of filteredAssignments) {
      const periodsNeeded = assignment.class_offerings.periods_per_week;
      let periodsScheduled = 0;

      // Get existing scheduled entries for this assignment
      const { data: existingEntries } = await supabase
        .from('timetable_entries')
        .select('*')
        .eq('teaching_assignment_id', assignment.id);

      periodsScheduled = existingEntries?.length || 0;

      // Try to schedule remaining periods
      while (periodsScheduled < periodsNeeded) {
        const availableSlot = await findBestTimeSlot(
          assignment,
          timeSlots,
          constraints,
          options.schoolId
        );

        if (!availableSlot) {
          errors.push(`Could not find suitable time slot for assignment ${assignment.id}`);
          break;
        }

        // Validate the potential schedule
        const validation = await validateScheduledEntry(
          options.schoolId,
          assignment.teacher_id,
          availableSlot.id,
          new Date().toISOString().split('T')[0]
        );

        if (!validation.isValid) {
          errors.push(...validation.errors);
          continue;
        }

        // Schedule the entry
        const { error: scheduleError } = await supabase
          .from('timetable_entries')
          .insert({
            teaching_assignment_id: assignment.id,
            timeslot_id: availableSlot.id,
            date: new Date().toISOString().split('T')[0]
          });

        if (scheduleError) {
          errors.push(`Failed to schedule entry: ${scheduleError.message}`);
          continue;
        }

        periodsScheduled++;
        totalScheduled++;
      }
    }

    // Validate the complete timetable
    const { data: finalTimetable } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        teaching_assignments (
          teacher_id,
          class_offering_id
        ),
        time_slots (*)
      `)
      .eq('teaching_assignments.class_offerings.term_id', options.termId);

    const validation = await validateTimetableAgainstConstraints(
      options.schoolId,
      finalTimetable || []
    );

    if (!validation.isValid) {
      errors.push(...validation.errors);
    }

    // Update timetable generation status
    await supabase
      .from('timetable_generations')
      .update({
        status: errors.length === 0 ? 'completed' : 'failed',
        notes: errors.length > 0 ? errors.join('\n') : null
      })
      .eq('id', timetable.id);

    return {
      success: errors.length === 0,
      errors,
      timetableId: timetable.id,
      lessonsScheduled: totalScheduled,
      totalLessonsNeeded: totalNeeded
    };

  } catch (error) {
    console.error('Error generating timetable:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
  }
}

async function findBestTimeSlot(
  assignment: TeachingAssignment & {
    class_offerings: ClassOffering;
  },
  availableSlots: TimeSlot[],
  constraints: SchoolConstraints,
  schoolId: string
): Promise<TimeSlot | null> {
  const supabase = await createClient();

  for (const slot of availableSlots) {
    // Check if slot is already taken
    const { data: existingEntries } = await supabase
      .from('timetable_entries')
      .select('id')
      .eq('timeslot_id', slot.id)
      .eq('teaching_assignments.teacher_id', assignment.teacher_id);

    if (existingEntries && existingEntries.length > 0) {
      continue;
    }

    // Check teacher constraints
    const { data: teacherConstraints } = await supabase
      .from('teacher_time_constraints')
      .select('*')
      .eq('teacher_id', assignment.teacher_id)
      .eq('time_slot_id', slot.id);

    if (teacherConstraints && teacherConstraints.length > 0) {
      continue;
    }

    // Validate against school constraints
    const validation = await validateScheduledEntry(
      schoolId,
      assignment.teacher_id,
      slot.id,
      new Date().toISOString().split('T')[0]
    );

    if (validation.isValid) {
      return slot;
    }
  }

  return null;
} 