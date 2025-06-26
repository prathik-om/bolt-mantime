import { NextRequest, NextResponse } from 'next/server';
import { createClient, getSchoolFromRequest } from '@/utils/supabase/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface TimetableGenerationRequest {
  academic_year_id: string;
  term_id: string;
  constraints?: any[];
  optimization_goals?: string[];
}

interface AIJobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
}

interface AIJobStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: any;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user and school
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const school = await getSchoolFromRequest(request);
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const body: TimetableGenerationRequest = await request.json();
    const { academic_year_id, term_id, constraints = [], optimization_goals = [] } = body;

    // Fetch all required data from database
    const [
      { data: academicYear },
      { data: term },
      { data: teachers },
      { data: classes },
      { data: rooms },
      { data: departments },
      { data: courses }
    ] = await Promise.all([
      supabase.from('academic_years').select('*').eq('id', academic_year_id).single(),
      supabase.from('terms').select('*').eq('id', term_id).single(),
      supabase.from('teachers').select(`
        *,
        teacher_departments!inner(
          department_id,
          is_primary
        )
      `).eq('school_id', school.id).eq('teacher_departments.is_primary', true),
      supabase.from('classes').select('*').eq('school_id', school.id),
      supabase.from('rooms').select('*').eq('school_id', school.id),
      supabase.from('departments').select('*').eq('school_id', school.id),
      supabase.from('courses').select('*').eq('school_id', school.id)
    ]);

    if (!academicYear || !term) {
      return NextResponse.json({ error: 'Academic year or term not found' }, { status: 404 });
    }

    // Fetch time slots for the term
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('*')
      .eq('term_id', term_id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (!timeSlots || timeSlots.length === 0) {
      return NextResponse.json({ error: 'No time slots found for this term' }, { status: 400 });
    }

    // Transform data for AI service
    const aiRequest = {
      school_config: {
        school_id: school.id,
        name: school.name,
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        start_time: '08:00:00',
        end_time: '16:00:00',
        lesson_duration_minutes: 60,
        break_duration_minutes: 15
      },
      teachers: teachers?.map(teacher => ({
        id: teacher.id,
        name: `${teacher.first_name} ${teacher.last_name}`,
        email: teacher.email,
        department_id: teacher.teacher_departments[0].department_id,
        max_hours_per_day: 6,
        max_hours_per_week: teacher.max_periods_per_week || 30,
        availability: {},
        qualifications: []
      })) || [],
      classes: classes?.map(cls => ({
        id: cls.id,
        name: cls.name,
        grade_level: cls.grade_level,
        student_count: 25,
        courses: courses?.map(course => ({
          course_id: course.id,
          hours_per_week: 4 // Default hours per week
        })) || []
      })) || [],
      rooms: rooms?.map(room => ({
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        room_type: room.room_type || 'classroom',
        equipment: [],
        availability: {}
      })) || [],
      time_slots: timeSlots.map(slot => ({
        id: slot.id,
        day: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][slot.day_of_week - 1],
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_type: 'regular'
      })),
      constraints: constraints,
      optimization_goals: optimization_goals
    };

    // Call AI service
    console.log('Calling AI service for timetable generation...');
    const aiResponse = await fetch(`${AI_SERVICE_URL}/generate-timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiRequest),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI service error:', errorText);
      return NextResponse.json(
        { error: 'Failed to start timetable generation', details: errorText },
        { status: 500 }
      );
    }

    const aiJobResponse: AIJobResponse = await aiResponse.json();
    console.log('AI service job started:', aiJobResponse.job_id);

    // Store job information in database for tracking
    const { data: jobRecord, error: jobError } = await supabase
      .from('timetable_generations')
      .insert({
        id: aiJobResponse.job_id,
        term_id: term_id,
        status: 'generating',
        generated_by: user.id,
        generated_at: new Date().toISOString(),
        notes: JSON.stringify(aiRequest)
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to store job record:', jobError);
      // Continue anyway, as the AI service job is already started
    }

    return NextResponse.json({
      job_id: aiJobResponse.job_id,
      status: aiJobResponse.status,
      message: aiJobResponse.message,
      progress: 0
    });

  } catch (error) {
    console.error('Timetable generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get user and school
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const school = await getSchoolFromRequest(request);
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get job record from database
    const { data: jobRecord, error: jobError } = await supabase
      .from('timetable_generations')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !jobRecord) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Call AI service to get job status
    const aiResponse = await fetch(`${AI_SERVICE_URL}/job-status/${jobId}`);
    if (!aiResponse.ok) {
      return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 });
    }

    const aiJobStatus: AIJobStatus = await aiResponse.json();

    // Update database with latest status
    const { error: updateError } = await supabase
      .from('timetable_generations')
      .update({
        status: aiJobStatus.status === 'completed' ? 'completed' : 
                aiJobStatus.status === 'failed' ? 'failed' : 'generating',
        notes: JSON.stringify({
          ...JSON.parse(jobRecord.notes || '{}'),
          progress: aiJobStatus.progress,
          message: aiJobStatus.message,
          result: aiJobStatus.result,
          error: aiJobStatus.error
        })
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Failed to update job record:', updateError);
    }

    return NextResponse.json({
      job_id: jobId,
      status: jobRecord.status,
      progress: aiJobStatus.progress || 0,
      message: aiJobStatus.message || 'Job status unknown',
      generated_at: jobRecord.generated_at,
      result: aiJobStatus.result,
      error: aiJobStatus.error
    });

  } catch (error) {
    console.error('Job status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function storeGeneratedTimetable(supabase: any, schoolId: string, timetable: any[]) {
  try {
    // Store timetable entries
    const timetableEntries = timetable.map(entry => ({
      school_id: schoolId,
      class_id: entry.class_id,
      teacher_id: entry.teacher_id,
      room_id: entry.room_id,
      time_slot_id: entry.time_slot_id,
      subject_id: entry.subject_id,
      day: entry.day,
      start_time: entry.start_time,
      end_time: entry.end_time,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('timetable_entries')
      .insert(timetableEntries);

    if (insertError) {
      console.error('Failed to store timetable entries:', insertError);
      throw insertError;
    }

    console.log(`Stored ${timetableEntries.length} timetable entries`);
  } catch (error) {
    console.error('Error storing generated timetable:', error);
    throw error;
  }
} 