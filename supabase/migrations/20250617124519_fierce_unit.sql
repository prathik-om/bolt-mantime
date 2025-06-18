/*
  # Digital Twin Database Schema for School Scheduling System

  This comprehensive schema creates a "digital twin" of a school's entire scheduling operation,
  capturing all entities, relationships, and constraints needed for intelligent AI-powered scheduling.

  ## Schema Philosophy
  1. **Normalization**: Single source of truth for all data
  2. **Flexibility**: Separation of concerns between curriculum planning and teacher assignments
  3. **Scalability**: UUID primary keys for enterprise-level performance

  ## Core Components
  1. **The "Nouns"**: Teachers, subjects, class_sections, rooms
  2. **The "Template"**: Time slots and scheduling framework
  3. **The "Workload"**: What needs to be taught (class_offerings)
  4. **The "Assignments"**: Who teaches what (teaching_assignments)
  5. **The "Rules"**: Constraints and business logic
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FOUNDATIONAL ENTITIES (The "When" Hierarchy)
-- =====================================================

-- Schools table (Multi-tenant support)
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  principal_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT schools_name_check CHECK (length(name) >= 2),
  CONSTRAINT schools_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Academic Years (e.g., "2024-2025")
CREATE TABLE IF NOT EXISTS academic_years (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT academic_years_date_check CHECK (end_date > start_date),
  CONSTRAINT academic_years_name_check CHECK (length(name) >= 4),
  UNIQUE(school_id, name)
);

-- Terms/Semesters (e.g., "Fall 2024", "Spring 2025")
CREATE TABLE IF NOT EXISTS terms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT terms_date_check CHECK (end_date > start_date),
  CONSTRAINT terms_name_check CHECK (length(name) >= 2),
  UNIQUE(academic_year_id, name)
);

-- Holidays and Non-Teaching Days
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT holidays_date_check CHECK (end_date >= start_date),
  CONSTRAINT holidays_name_check CHECK (length(name) >= 2)
);

-- =====================================================
-- CORE ENTITIES (The "Nouns")
-- =====================================================

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_id text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  hire_date date,
  department text,
  max_periods_per_day integer DEFAULT 6,
  max_periods_per_week integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT teachers_name_check CHECK (length(first_name) >= 1 AND length(last_name) >= 1),
  CONSTRAINT teachers_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT teachers_max_periods_check CHECK (max_periods_per_day > 0 AND max_periods_per_week > 0),
  UNIQUE(school_id, employee_id)
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  department text,
  description text,
  requires_lab boolean DEFAULT false,
  requires_computer boolean DEFAULT false,
  requires_projector boolean DEFAULT false,
  is_core_subject boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT subjects_name_check CHECK (length(name) >= 2),
  CONSTRAINT subjects_code_check CHECK (length(code) >= 2),
  UNIQUE(school_id, code)
);

-- Rooms/Classrooms
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  room_number text,
  building text,
  floor_number integer,
  capacity integer DEFAULT 30,
  room_type text DEFAULT 'regular', -- regular, lab, computer_lab, auditorium, gym
  has_projector boolean DEFAULT false,
  has_computers boolean DEFAULT false,
  has_lab_equipment boolean DEFAULT false,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT rooms_name_check CHECK (length(name) >= 1),
  CONSTRAINT rooms_capacity_check CHECK (capacity > 0),
  CONSTRAINT rooms_type_check CHECK (room_type IN ('regular', 'lab', 'computer_lab', 'auditorium', 'gym', 'library')),
  UNIQUE(school_id, room_number)
);

-- Class Sections (e.g., "Grade 9A", "Grade 10B")
CREATE TABLE IF NOT EXISTS class_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_level integer NOT NULL,
  section_name text NOT NULL,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  homeroom_teacher_id uuid REFERENCES teachers(id),
  student_count integer DEFAULT 0,
  max_capacity integer DEFAULT 35,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT class_sections_grade_check CHECK (grade_level >= 1 AND grade_level <= 12),
  CONSTRAINT class_sections_section_check CHECK (length(section_name) >= 1),
  CONSTRAINT class_sections_capacity_check CHECK (student_count >= 0 AND max_capacity > 0),
  UNIQUE(school_id, academic_year_id, grade_level, section_name)
);

-- =====================================================
-- TEMPLATE STRUCTURE (The "When")
-- =====================================================

-- Time Slots (The scheduling template)
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL, -- 1=Monday, 2=Tuesday, etc.
  period_number integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_type text DEFAULT 'regular', -- regular, break, lunch, assembly
  is_teaching_period boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT time_slots_day_check CHECK (day_of_week >= 1 AND day_of_week <= 7),
  CONSTRAINT time_slots_period_check CHECK (period_number >= 1),
  CONSTRAINT time_slots_time_check CHECK (end_time > start_time),
  CONSTRAINT time_slots_type_check CHECK (slot_type IN ('regular', 'break', 'lunch', 'assembly', 'study_hall')),
  UNIQUE(school_id, day_of_week, period_number)
);

-- =====================================================
-- RELATIONSHIP TABLES (The "Glue")
-- =====================================================

-- Teacher Qualifications (Who can teach what)
CREATE TABLE IF NOT EXISTS teacher_qualifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  qualification_level text DEFAULT 'qualified', -- qualified, preferred, emergency
  years_experience integer DEFAULT 0,
  certification_date date,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT teacher_qualifications_level_check CHECK (qualification_level IN ('qualified', 'preferred', 'emergency')),
  CONSTRAINT teacher_qualifications_experience_check CHECK (years_experience >= 0),
  UNIQUE(teacher_id, subject_id)
);

-- Teacher Availability/Constraints
CREATE TABLE IF NOT EXISTS teacher_constraints (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  time_slot_id uuid NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  constraint_type text NOT NULL, -- unavailable, preferred, avoid
  reason text,
  priority integer DEFAULT 1, -- 1=low, 5=high
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT teacher_constraints_type_check CHECK (constraint_type IN ('unavailable', 'preferred', 'avoid')),
  CONSTRAINT teacher_constraints_priority_check CHECK (priority >= 1 AND priority <= 5),
  UNIQUE(teacher_id, time_slot_id)
);

-- =====================================================
-- WORKLOAD DEFINITION (The "What")
-- =====================================================

-- Class Offerings (What needs to be taught)
CREATE TABLE IF NOT EXISTS class_offerings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_section_id uuid NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  periods_per_week integer NOT NULL,
  requires_consecutive_periods boolean DEFAULT false,
  preferred_room_type text,
  min_gap_between_periods integer DEFAULT 0, -- in periods
  max_gap_between_periods integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT class_offerings_periods_check CHECK (periods_per_week >= 1 AND periods_per_week <= 10),
  CONSTRAINT class_offerings_gap_check CHECK (min_gap_between_periods >= 0 AND max_gap_between_periods >= min_gap_between_periods),
  UNIQUE(class_section_id, subject_id, term_id)
);

-- =====================================================
-- ASSIGNMENTS (The "Who")
-- =====================================================

-- Teaching Assignments (Who teaches what)
CREATE TABLE IF NOT EXISTS teaching_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  assignment_type text DEFAULT 'primary', -- primary, co_teacher, substitute
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT teaching_assignments_type_check CHECK (assignment_type IN ('primary', 'co_teacher', 'substitute')),
  UNIQUE(class_offering_id, teacher_id, assignment_type)
);

-- =====================================================
-- GENERATED SCHEDULES (The "Result")
-- =====================================================

-- Generated Timetables
CREATE TABLE IF NOT EXISTS timetables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  name text NOT NULL,
  generation_algorithm text DEFAULT 'ai_optimizer',
  generation_parameters jsonb,
  status text DEFAULT 'draft', -- draft, active, archived
  conflict_count integer DEFAULT 0,
  optimization_score decimal(5,2),
  generated_at timestamptz DEFAULT now(),
  activated_at timestamptz,
  created_by uuid REFERENCES teachers(id),
  
  CONSTRAINT timetables_name_check CHECK (length(name) >= 2),
  CONSTRAINT timetables_status_check CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT timetables_score_check CHECK (optimization_score >= 0 AND optimization_score <= 100)
);

-- Timetable Entries (Individual schedule slots)
CREATE TABLE IF NOT EXISTS timetable_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id uuid NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id),
  time_slot_id uuid NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  entry_type text DEFAULT 'regular', -- regular, makeup, substitute
  notes text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT timetable_entries_type_check CHECK (entry_type IN ('regular', 'makeup', 'substitute')),
  UNIQUE(timetable_id, time_slot_id, teacher_id),
  UNIQUE(timetable_id, time_slot_id, room_id)
);

-- Scheduling Conflicts (AI-detected issues)
CREATE TABLE IF NOT EXISTS scheduling_conflicts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id uuid NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  conflict_type text NOT NULL,
  severity text DEFAULT 'medium', -- low, medium, high, critical
  description text NOT NULL,
  affected_entries uuid[] DEFAULT '{}',
  suggested_resolution text,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  
  CONSTRAINT scheduling_conflicts_type_check CHECK (conflict_type IN ('teacher_double_booking', 'room_double_booking', 'class_double_booking', 'teacher_unavailable', 'room_unsuitable', 'workload_violation')),
  CONSTRAINT scheduling_conflicts_severity_check CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_conflicts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Schools: Users can only access their own school's data
CREATE POLICY "Users can access their own school" ON schools
  FOR ALL TO authenticated
  USING (auth.uid()::text = ANY(SELECT unnest(string_to_array(current_setting('app.current_user_schools', true), ','))));

-- Academic Years: Access based on school association
CREATE POLICY "Users can access academic years for their schools" ON academic_years
  FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM schools WHERE auth.uid()::text = ANY(SELECT unnest(string_to_array(current_setting('app.current_user_schools', true), ',')))));

-- Apply similar policies to all other tables
CREATE POLICY "Users can access terms for their schools" ON terms
  FOR ALL TO authenticated
  USING (academic_year_id IN (SELECT id FROM academic_years WHERE school_id IN (SELECT id FROM schools WHERE auth.uid()::text = ANY(SELECT unnest(string_to_array(current_setting('app.current_user_schools', true), ','))))));

CREATE POLICY "Users can access holidays for their schools" ON holidays
  FOR ALL TO authenticated
  USING (academic_year_id IN (SELECT id FROM academic_years WHERE school_id IN (SELECT id FROM schools WHERE auth.uid()::text = ANY(SELECT unnest(string_to_array(current_setting('app.current_user_schools', true), ','))))));

CREATE POLICY "Users can access teachers for their schools" ON teachers
  FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM schools WHERE auth.uid()::text = ANY(SELECT unnest(string_to_array(current_setting('app.current_user_schools', true), ',')))));

CREATE POLICY "Users can access subjects for their schools" ON subjects
  FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM schools WHERE auth.uid()::text = ANY(SELECT unnest(string_to_array(current_setting('app.current_user_schools', true), ',')))));

CREATE POLICY "Users can access rooms for their schools" ON rooms
  FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM schools WHERE auth.uid()::text = ANY(SELECT unnest(string_to_array(current_setting('app.current_user_schools', true), ',')))));

CREATE POLICY "Users can access class sections for their schools" ON class_sections
  FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM schools WHERE auth.uid()::text = ANY(SELECT unnest(string_to_array(current_setting('app.current_user_schools', true), ',')))));

CREATE POLICY "Users can access time slots for their schools" ON time_slots
  FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM schools WHERE auth.uid()::text = ANY(SELECT unnest(string_to_array(current_setting('app.current_user_schools', true), ',')))));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core lookup indexes
CREATE INDEX IF NOT EXISTS idx_academic_years_school_current ON academic_years(school_id, is_current);
CREATE INDEX IF NOT EXISTS idx_terms_academic_year_current ON terms(academic_year_id, is_current);
CREATE INDEX IF NOT EXISTS idx_teachers_school_active ON teachers(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_class_sections_school_year ON class_sections(school_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_school_day ON time_slots(school_id, day_of_week);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_teacher_qualifications_teacher ON teacher_qualifications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_qualifications_subject ON teacher_qualifications(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_offerings_section ON class_offerings(class_section_id);
CREATE INDEX IF NOT EXISTS idx_class_offerings_subject ON class_offerings(subject_id);
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_offering ON teaching_assignments(class_offering_id);
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_teacher ON teaching_assignments(teacher_id);

-- Timetable indexes
CREATE INDEX IF NOT EXISTS idx_timetable_entries_timetable ON timetable_entries(timetable_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_time_slot ON timetable_entries(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_teacher ON timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_room ON timetable_entries(room_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate timetable consistency
CREATE OR REPLACE FUNCTION validate_timetable_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for teacher double booking
  IF EXISTS (
    SELECT 1 FROM timetable_entries 
    WHERE timetable_id = NEW.timetable_id 
    AND time_slot_id = NEW.time_slot_id 
    AND teacher_id = NEW.teacher_id 
    AND id != COALESCE(NEW.id, uuid_generate_v4())
  ) THEN
    RAISE EXCEPTION 'Teacher is already scheduled for this time slot';
  END IF;
  
  -- Check for room double booking
  IF NEW.room_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM timetable_entries 
    WHERE timetable_id = NEW.timetable_id 
    AND time_slot_id = NEW.time_slot_id 
    AND room_id = NEW.room_id 
    AND id != COALESCE(NEW.id, uuid_generate_v4())
  ) THEN
    RAISE EXCEPTION 'Room is already booked for this time slot';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply validation trigger
CREATE TRIGGER validate_timetable_entry_trigger 
  BEFORE INSERT OR UPDATE ON timetable_entries
  FOR EACH ROW EXECUTE FUNCTION validate_timetable_entry();