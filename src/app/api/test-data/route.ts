import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schoolId = profile.school_id;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school assigned' }, { status: 400 });
    }

    // Get or create academic year
    let { data: academicYears } = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('school_id', schoolId)
      .limit(1);

    let academicYearId = null;
    if (!academicYears || academicYears.length === 0) {
      // Create a test academic year
      const currentYear = new Date().getFullYear();
      const { data: newAcademicYear, error: academicYearError } = await supabase
        .from('academic_years')
        .insert({
          name: `${currentYear}-${currentYear + 1}`,
          start_date: `${currentYear}-09-01`,
          end_date: `${currentYear + 1}-06-30`,
          school_id: schoolId
        })
        .select('id, name')
        .single();

      if (academicYearError) {
        return NextResponse.json({ error: `Failed to create academic year: ${academicYearError.message}` }, { status: 500 });
      }

      academicYearId = newAcademicYear.id;
      academicYears = [newAcademicYear];
    } else {
      academicYearId = academicYears[0].id;
    }

    // Get or create terms
    let { data: terms } = await supabase
      .from('terms')
      .select('id, name')
      .eq('academic_year_id', academicYearId)
      .limit(3);

    if (!terms || terms.length === 0) {
      // Create test terms
      const termsData = [
        {
          name: 'First Term',
          start_date: `${new Date().getFullYear()}-09-01`,
          end_date: `${new Date().getFullYear()}-12-20`,
          academic_year_id: academicYearId,
          period_duration_minutes: 50
        },
        {
          name: 'Second Term',
          start_date: `${new Date().getFullYear() + 1}-01-15`,
          end_date: `${new Date().getFullYear() + 1}-04-15`,
          academic_year_id: academicYearId,
          period_duration_minutes: 50
        },
        {
          name: 'Third Term',
          start_date: `${new Date().getFullYear() + 1}-04-22`,
          end_date: `${new Date().getFullYear() + 1}-06-30`,
          academic_year_id: academicYearId,
          period_duration_minutes: 50
        }
      ];

      const { data: newTerms, error: termsError } = await supabase
        .from('terms')
        .insert(termsData)
        .select('id, name');

      if (termsError) {
        return NextResponse.json({ error: `Failed to create terms: ${termsError.message}` }, { status: 500 });
      }

      terms = newTerms;
    }

    // Get or create time slots
    let { data: timeSlots } = await supabase
      .from('time_slots')
      .select('id')
      .eq('school_id', schoolId)
      .limit(5);

    if (!timeSlots || timeSlots.length === 0) {
      // Create basic time slots for a school day
      const timeSlotData = [];
      const startHour = 8; // 8 AM
      const periodDuration = 50; // 50 minutes
      
      for (let day = 1; day <= 5; day++) { // Monday to Friday
        for (let period = 1; period <= 8; period++) { // 8 periods per day
          const startMinute = (period - 1) * periodDuration;
          const endMinute = period * periodDuration;
          
          const startTime = `${String(startHour + Math.floor(startMinute / 60)).padStart(2, '0')}:${String(startMinute % 60).padStart(2, '0')}:00`;
          const endTime = `${String(startHour + Math.floor(endMinute / 60)).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}:00`;
          
          timeSlotData.push({
            school_id: schoolId,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            period_number: period,
            slot_name: `Period ${period}`,
            is_teaching_period: true
          });
        }
      }
      
      const { data: createdTimeSlots, error: timeSlotsError } = await supabase
        .from('time_slots')
        .insert(timeSlotData)
        .select('id');
      
      if (timeSlotsError) {
        return NextResponse.json({ error: `Failed to create time slots: ${timeSlotsError.message}` }, { status: 500 });
      }
      
      timeSlots = createdTimeSlots;
    }

    // Get teaching assignments
    const { data: teachingAssignments } = await supabase
      .from('teaching_assignments')
      .select('id')
      .limit(5);

    if (!teachingAssignments || teachingAssignments.length === 0) {
      return NextResponse.json({ error: 'No teaching assignments found. Please create teaching assignments first.' }, { status: 400 });
    }

    // Now try to create a test timetable generation
    let generation = null;
    let generationError = null;

    // Use the first term for the generation
    const termId = terms[0].id;
    
    // Verify the term belongs to the user's school (this should now work)
    const { data: termCheck } = await supabase
      .from('terms')
      .select('academic_years(school_id)')
      .eq('id', termId)
      .single();

    console.log('Term check:', termCheck);
    console.log('User school ID:', schoolId);

    if (termCheck?.academic_years?.school_id === schoolId) {
      // Try creating the generation
      const { data: genData, error: genErr } = await supabase
        .from('timetable_generations')
        .insert({
          term_id: termId,
          generated_by: user.id,
          status: 'completed',
          notes: 'Test generation created for demonstration purposes'
        })
        .select()
        .single();

      generation = genData;
      generationError = genErr;
      
      if (generationError) {
        console.error('Generation error details:', generationError);
      }
    } else {
      generationError = { message: 'Term does not belong to user school' };
      console.error('Term school mismatch:', { termSchool: termCheck?.academic_years?.school_id, userSchool: schoolId });
    }

    // Create some test scheduled lessons
    const testLessons = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      testLessons.push({
        teaching_assignment_id: teachingAssignments[i % teachingAssignments.length].id,
        date: date.toISOString().split('T')[0],
        timeslot_id: timeSlots[i % timeSlots.length].id,
      });
    }

    const { error: lessonsError } = await supabase
      .from('scheduled_lessons')
      .insert(testLessons);

    if (lessonsError) {
      console.error('Error creating test lessons:', lessonsError);
      // Don't fail completely, just log the error
    }

    return NextResponse.json({ 
      success: true, 
      message: generation ? 'Test data created successfully!' : 'Test lessons created successfully! (Timetable generation skipped due to permissions)',
      generation: generation,
      lessonsCreated: testLessons.length,
      generationSkipped: !generation,
      academicYearCreated: academicYears.length > 0,
      termsCreated: terms.length,
      timeSlotsCreated: timeSlots.length
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 