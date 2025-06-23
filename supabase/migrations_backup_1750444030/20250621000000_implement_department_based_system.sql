-- Migration: Implement Department-Based System with Flexible Course Creation
-- This migration transforms the current subject-based system to a department-based system
-- with optional codes, bulk course creation, and holiday management

-- 0. Create departments table (must exist before any referencing tables)
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE, -- Made optional
    description TEXT,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Create courses table (must exist before any ALTER TABLE)
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    grade_level INTEGER NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    code TEXT, -- Optional course code
    grade_label TEXT, -- For differentiation when code is not provided
    display_name TEXT, -- Computed field for UI display
    min_hours_per_term INTEGER DEFAULT 0,
    max_hours_per_term INTEGER DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create teacher_departments table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS teacher_departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- Primary department for the teacher
    max_hours_per_week INTEGER DEFAULT 25, -- Maximum teaching hours per week
    preferred_grade_levels INTEGER[], -- Preferred grade levels to teach
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, department_id)
);

-- 3. Create course_grade_mappings table for flexible grade assignments
CREATE TABLE IF NOT EXISTS course_grade_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
    is_default BOOLEAN DEFAULT true, -- Apply to all classes of this grade
    class_section_ids UUID[] DEFAULT NULL, -- Specific class sections if not default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, grade_level)
);

-- 4. Create bulk course creation template table
CREATE TABLE IF NOT EXISTS course_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    description TEXT,
    grade_levels INTEGER[] NOT NULL, -- Array of grades to create courses for
    min_hours_per_term INTEGER DEFAULT 0,
    max_hours_per_term INTEGER DEFAULT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enhanced holidays table with better structure
CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('public_holiday', 'school_holiday', 'exam_day', 'event_day')),
    description TEXT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, school_id) -- Prevent duplicate holidays on same date
);

-- 6. Create working days configuration table
CREATE TABLE IF NOT EXISTS working_days_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    working_days_per_week INTEGER NOT NULL DEFAULT 5 CHECK (working_days_per_week >= 1 AND working_days_per_week <= 7),
    hours_per_day DECIMAL(4,2) NOT NULL DEFAULT 6.0,
    periods_per_day INTEGER NOT NULL DEFAULT 6,
    period_duration_minutes INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, academic_year_id, term_id)
);

-- 7. Create class_offerings table (must exist before ALTER TABLE)
CREATE TABLE IF NOT EXISTS class_offerings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    max_students INTEGER DEFAULT 30,
    current_students INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enhanced class offerings with teacher assignment flexibility
ALTER TABLE class_offerings 
ADD COLUMN assignment_type TEXT DEFAULT 'ai' CHECK (assignment_type IN ('ai', 'manual', 'ai_suggested')),
ADD COLUMN ai_assigned_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
ADD COLUMN manual_assigned_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
ADD COLUMN assignment_notes TEXT,
ADD COLUMN assignment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 9. Create teacher workload tracking table
CREATE TABLE IF NOT EXISTS teacher_workload (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    current_hours_per_week DECIMAL(4,2) DEFAULT 0,
    max_hours_per_week INTEGER DEFAULT 25,
    current_courses_count INTEGER DEFAULT 0,
    max_courses_count INTEGER DEFAULT 6,
    workload_status TEXT DEFAULT 'available' CHECK (workload_status IN ('available', 'moderate', 'high', 'overloaded')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, academic_year_id, term_id)
);

-- 10. Create AI assignment suggestions table
CREATE TABLE IF NOT EXISTS ai_teacher_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_offering_id UUID NOT NULL REFERENCES class_offerings(id) ON DELETE CASCADE,
    suggested_teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    reasoning TEXT, -- AI reasoning for the suggestion
    alternative_teachers UUID[], -- Alternative teacher suggestions
    conflicts_detected TEXT[], -- Any conflicts detected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_applied BOOLEAN DEFAULT false
);

-- 11. Create functions for hours calculation
CREATE OR REPLACE FUNCTION calculate_available_teaching_hours(
    term_start_date DATE,
    term_end_date DATE,
    school_id UUID,
    academic_year_id UUID
)
RETURNS TABLE(
    total_working_days INTEGER,
    total_teaching_hours DECIMAL(8,2),
    holidays_count INTEGER,
    weekends_count INTEGER
) AS $$
DECLARE
    working_days_per_week INTEGER;
    hours_per_day DECIMAL(4,2);
    current_date DATE;
    day_of_week INTEGER;
    holiday_count INTEGER := 0;
    weekend_count INTEGER := 0;
    working_day_count INTEGER := 0;
BEGIN
    -- Get working days configuration
    SELECT wdc.working_days_per_week, wdc.hours_per_day
    INTO working_days_per_week, hours_per_day
    FROM working_days_config wdc
    WHERE wdc.school_id = calculate_available_teaching_hours.school_id
    AND wdc.academic_year_id = calculate_available_teaching_hours.academic_year_id
    AND wdc.term_id IN (
        SELECT id FROM terms 
        WHERE academic_year_id = calculate_available_teaching_hours.academic_year_id
        AND start_date <= term_start_date AND end_date >= term_end_date
    )
    LIMIT 1;
    
    -- Default values if no config found
    working_days_per_week := COALESCE(working_days_per_week, 5);
    hours_per_day := COALESCE(hours_per_day, 6.0);
    
    -- Calculate working days and holidays
    current_date := term_start_date;
    WHILE current_date <= term_end_date LOOP
        day_of_week := EXTRACT(DOW FROM current_date);
        
        -- Check if it's a weekend (0 = Sunday, 6 = Saturday)
        IF day_of_week = 0 OR day_of_week = 6 THEN
            weekend_count := weekend_count + 1;
        ELSE
            -- Check if it's a holiday
            IF EXISTS (
                SELECT 1 FROM holidays 
                WHERE date = current_date 
                AND school_id = calculate_available_teaching_hours.school_id
            ) THEN
                holiday_count := holiday_count + 1;
            ELSE
                working_day_count := working_day_count + 1;
            END IF;
        END IF;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN QUERY SELECT 
        working_day_count,
        (working_day_count * hours_per_day)::DECIMAL(8,2),
        holiday_count,
        weekend_count;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to validate course hours against available time
CREATE OR REPLACE FUNCTION validate_course_hours_requirements(
    course_id UUID,
    term_id UUID
)
RETURNS TABLE(
    is_valid BOOLEAN,
    required_hours INTEGER,
    available_hours DECIMAL(8,2),
    deficit_hours DECIMAL(8,2),
    message TEXT
) AS $$
DECLARE
    course_record RECORD;
    term_record RECORD;
    hours_calculation RECORD;
    available_hours DECIMAL(8,2);
    deficit_hours DECIMAL(8,2);
BEGIN
    -- Get course details
    SELECT * INTO course_record FROM courses WHERE id = course_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0.0, 0.0, 'Course not found';
        RETURN;
    END IF;
    
    -- Get term details
    SELECT * INTO term_record FROM terms WHERE id = term_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0.0, 0.0, 'Term not found';
        RETURN;
    END IF;
    
    -- Calculate available hours
    SELECT * INTO hours_calculation 
    FROM calculate_available_teaching_hours(
        term_record.start_date, 
        term_record.end_date, 
        course_record.school_id, 
        term_record.academic_year_id
    );
    
    available_hours := hours_calculation.total_teaching_hours;
    
    -- Check minimum hours requirement
    IF course_record.min_hours_per_term > available_hours THEN
        deficit_hours := course_record.min_hours_per_term - available_hours;
        RETURN QUERY SELECT 
            false, 
            course_record.min_hours_per_term, 
            available_hours, 
            deficit_hours,
            'Insufficient available hours for minimum requirement';
    ELSE
        RETURN QUERY SELECT 
            true, 
            course_record.min_hours_per_term, 
            available_hours, 
            0.0,
            'Hours requirement can be met';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 13. Create function to get teacher workload insights
CREATE OR REPLACE FUNCTION get_teacher_workload_insights(
    school_id UUID,
    academic_year_id UUID,
    term_id UUID
)
RETURNS TABLE(
    teacher_id UUID,
    teacher_name TEXT,
    department_name TEXT,
    current_hours_per_week DECIMAL(4,2),
    max_hours_per_week INTEGER,
    current_courses_count INTEGER,
    max_courses_count INTEGER,
    workload_status TEXT,
    available_hours DECIMAL(4,2),
    utilization_percentage DECIMAL(5,2),
    recommended_for_new_assignments BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tw.teacher_id,
        (t.first_name || ' ' || t.last_name)::TEXT as teacher_name,
        d.name::TEXT as department_name,
        tw.current_hours_per_week,
        tw.max_hours_per_week,
        tw.current_courses_count,
        tw.max_courses_count,
        tw.workload_status,
        (tw.max_hours_per_week - tw.current_hours_per_week)::DECIMAL(4,2) as available_hours,
        CASE 
            WHEN tw.max_hours_per_week > 0 
            THEN (tw.current_hours_per_week / tw.max_hours_per_week * 100)::DECIMAL(5,2)
            ELSE 0::DECIMAL(5,2)
        END as utilization_percentage,
        CASE 
            WHEN tw.workload_status IN ('available', 'moderate') 
            AND tw.current_hours_per_week < tw.max_hours_per_week
            AND tw.current_courses_count < tw.max_courses_count
            THEN true
            ELSE false
        END as recommended_for_new_assignments
    FROM teacher_workload tw
    JOIN teachers t ON tw.teacher_id = t.id
    LEFT JOIN teacher_departments td ON t.id = td.teacher_id AND td.is_primary = true
    LEFT JOIN departments d ON td.department_id = d.id
    WHERE tw.school_id = get_teacher_workload_insights.school_id
    AND tw.academic_year_id = get_teacher_workload_insights.academic_year_id
    AND tw.term_id = get_teacher_workload_insights.term_id
    ORDER BY tw.current_hours_per_week ASC, tw.workload_status ASC;
END;
$$ LANGUAGE plpgsql;

-- 14. Create function to suggest teachers for course assignment
CREATE OR REPLACE FUNCTION suggest_teachers_for_course(
    course_id UUID,
    class_section_id UUID,
    academic_year_id UUID,
    term_id UUID
)
RETURNS TABLE(
    teacher_id UUID,
    teacher_name TEXT,
    department_name TEXT,
    confidence_score DECIMAL(3,2),
    reasoning TEXT,
    current_workload DECIMAL(4,2),
    available_hours DECIMAL(4,2),
    grade_preference_match BOOLEAN,
    department_match BOOLEAN
) AS $$
DECLARE
    course_record RECORD;
    class_section_record RECORD;
    teacher_record RECORD;
    grade_level INTEGER;
    department_id UUID;
BEGIN
    -- Get course and class section details
    SELECT * INTO course_record FROM courses WHERE id = course_id;
    SELECT * INTO class_section_record FROM class_sections WHERE id = class_section_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    grade_level := class_section_record.grade_level;
    department_id := course_record.department_id;
    
    -- Return teacher suggestions
    RETURN QUERY
    SELECT 
        t.id as teacher_id,
        (t.first_name || ' ' || t.last_name)::TEXT as teacher_name,
        d.name::TEXT as department_name,
        CASE 
            -- Perfect match: department + grade preference + available
            WHEN td.department_id = department_id 
                AND grade_level = ANY(td.preferred_grade_levels)
                AND tw.workload_status IN ('available', 'moderate')
            THEN 0.95::DECIMAL(3,2)
            -- Good match: department + available
            WHEN td.department_id = department_id 
                AND tw.workload_status IN ('available', 'moderate')
            THEN 0.85::DECIMAL(3,2)
            -- Acceptable match: department + some availability
            WHEN td.department_id = department_id 
                AND tw.workload_status = 'high'
            THEN 0.70::DECIMAL(3,2)
            -- Poor match: different department but available
            WHEN tw.workload_status IN ('available', 'moderate')
            THEN 0.50::DECIMAL(3,2)
            ELSE 0.30::DECIMAL(3,2)
        END as confidence_score,
        CASE 
            WHEN td.department_id = department_id AND grade_level = ANY(td.preferred_grade_levels)
            THEN 'Perfect match: Department and grade preference aligned'
            WHEN td.department_id = department_id
            THEN 'Good match: Department aligned'
            WHEN tw.workload_status IN ('available', 'moderate')
            THEN 'Available teacher with capacity'
            ELSE 'Limited availability'
        END::TEXT as reasoning,
        tw.current_hours_per_week,
        (tw.max_hours_per_week - tw.current_hours_per_week)::DECIMAL(4,2) as available_hours,
        (grade_level = ANY(td.preferred_grade_levels))::BOOLEAN as grade_preference_match,
        (td.department_id = department_id)::BOOLEAN as department_match
    FROM teachers t
    JOIN teacher_workload tw ON t.id = tw.teacher_id
    LEFT JOIN teacher_departments td ON t.id = td.teacher_id
    LEFT JOIN departments d ON td.department_id = d.id
    WHERE tw.academic_year_id = suggest_teachers_for_course.academic_year_id
    AND tw.term_id = suggest_teachers_for_course.term_id
    AND tw.workload_status != 'overloaded'
    ORDER BY confidence_score DESC, tw.current_hours_per_week ASC;
END;
$$ LANGUAGE plpgsql;

-- 15. Create function to update teacher workload
CREATE OR REPLACE FUNCTION update_teacher_workload()
RETURNS TRIGGER AS $$
DECLARE
    teacher_id UUID;
    academic_year_id UUID;
    term_id UUID;
    school_id UUID;
    current_hours DECIMAL(4,2);
    current_courses INTEGER;
BEGIN
    -- Determine which teacher and context
    IF TG_OP = 'INSERT' THEN
        teacher_id := NEW.teacher_id;
        academic_year_id := NEW.academic_year_id;
        term_id := NEW.term_id;
        school_id := (SELECT school_id FROM courses WHERE id = NEW.course_id);
    ELSIF TG_OP = 'UPDATE' THEN
        teacher_id := NEW.teacher_id;
        academic_year_id := NEW.academic_year_id;
        term_id := NEW.term_id;
        school_id := (SELECT school_id FROM courses WHERE id = NEW.course_id);
    ELSIF TG_OP = 'DELETE' THEN
        teacher_id := OLD.teacher_id;
        academic_year_id := OLD.academic_year_id;
        term_id := OLD.term_id;
        school_id := (SELECT school_id FROM courses WHERE id = OLD.course_id);
    END IF;
    
    -- Calculate current workload
    SELECT 
        COALESCE(SUM(c.min_hours_per_term), 0) / 12.0, -- Approximate hours per week
        COUNT(*)
    INTO current_hours, current_courses
    FROM class_offerings co
    JOIN courses c ON co.course_id = c.id
    WHERE co.teacher_id = teacher_id
    AND co.academic_year_id = academic_year_id
    AND co.term_id = term_id;
    
    -- Update or insert workload record
    INSERT INTO teacher_workload (
        teacher_id, academic_year_id, term_id, school_id,
        current_hours_per_week, current_courses_count, last_updated
    ) VALUES (
        teacher_id, academic_year_id, term_id, school_id,
        current_hours, current_courses, NOW()
    )
    ON CONFLICT (teacher_id, academic_year_id, term_id)
    DO UPDATE SET
        current_hours_per_week = EXCLUDED.current_hours_per_week,
        current_courses_count = EXCLUDED.current_courses_count,
        last_updated = NOW(),
        workload_status = CASE 
            WHEN EXCLUDED.current_hours_per_week >= max_hours_per_week THEN 'overloaded'
            WHEN EXCLUDED.current_hours_per_week >= max_hours_per_week * 0.8 THEN 'high'
            WHEN EXCLUDED.current_hours_per_week >= max_hours_per_week * 0.6 THEN 'moderate'
            ELSE 'available'
        END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 16. Create indexes for performance
CREATE INDEX idx_departments_school_id ON departments(school_id);
CREATE INDEX idx_teacher_departments_teacher_id ON teacher_departments(teacher_id);
CREATE INDEX idx_teacher_departments_department_id ON teacher_departments(department_id);
CREATE INDEX idx_courses_department_id ON courses(department_id);
CREATE INDEX idx_courses_grade_label ON courses(grade_label);
CREATE INDEX idx_course_grade_mappings_course_id ON course_grade_mappings(course_id);
CREATE INDEX idx_course_grade_mappings_grade_level ON course_grade_mappings(grade_level);
CREATE INDEX idx_course_templates_department_id ON course_templates(department_id);
CREATE INDEX idx_course_templates_school_id ON course_templates(school_id);
CREATE INDEX idx_holidays_school_id ON holidays(school_id);
CREATE INDEX idx_holidays_academic_year_id ON holidays(academic_year_id);
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_working_days_config_school_id ON working_days_config(school_id);
CREATE INDEX idx_working_days_config_academic_year_id ON working_days_config(academic_year_id);
CREATE INDEX idx_class_offerings_assignment_type ON class_offerings(assignment_type);
CREATE INDEX idx_class_offerings_ai_assigned_teacher_id ON class_offerings(ai_assigned_teacher_id);
CREATE INDEX idx_class_offerings_manual_assigned_teacher_id ON class_offerings(manual_assigned_teacher_id);
CREATE INDEX idx_teacher_workload_teacher_id ON teacher_workload(teacher_id);
CREATE INDEX idx_teacher_workload_academic_year_id ON teacher_workload(academic_year_id);
CREATE INDEX idx_teacher_workload_term_id ON teacher_workload(term_id);
CREATE INDEX idx_ai_teacher_assignments_class_offering_id ON ai_teacher_assignments(class_offering_id);

-- 17. Add RLS policies
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_grade_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_days_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_workload ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Departments policies
CREATE POLICY "Users can view departments in their school" ON departments
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage departments in their school" ON departments
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Teacher departments policies
CREATE POLICY "Users can view teacher departments in their school" ON teacher_departments
    FOR SELECT USING (
        department_id IN (
            SELECT d.id FROM departments d 
            JOIN profiles p ON d.school_id = p.school_id 
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage teacher departments in their school" ON teacher_departments
    FOR ALL USING (
        department_id IN (
            SELECT d.id FROM departments d 
            JOIN profiles p ON d.school_id = p.school_id 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Course grade mappings policies
CREATE POLICY "Users can view course grade mappings in their school" ON course_grade_mappings
    FOR SELECT USING (
        course_id IN (
            SELECT c.id FROM courses c 
            JOIN profiles p ON c.school_id = p.school_id 
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage course grade mappings in their school" ON course_grade_mappings
    FOR ALL USING (
        course_id IN (
            SELECT c.id FROM courses c 
            JOIN profiles p ON c.school_id = p.school_id 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Course templates policies
CREATE POLICY "Users can view course templates in their school" ON course_templates
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage course templates in their school" ON course_templates
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Holidays policies
CREATE POLICY "Users can view holidays in their school" ON holidays
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage holidays in their school" ON holidays
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Working days config policies
CREATE POLICY "Users can view working days config in their school" ON working_days_config
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage working days config in their school" ON working_days_config
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Teacher workload policies
CREATE POLICY "Users can view teacher workload in their school" ON teacher_workload
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage teacher workload in their school" ON teacher_workload
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- AI teacher assignments policies
CREATE POLICY "Users can view AI teacher assignments in their school" ON ai_teacher_assignments
    FOR SELECT USING (
        class_offering_id IN (
            SELECT co.id FROM class_offerings co
            JOIN courses c ON co.course_id = c.id
            JOIN profiles p ON c.school_id = p.school_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage AI teacher assignments in their school" ON ai_teacher_assignments
    FOR ALL USING (
        class_offering_id IN (
            SELECT co.id FROM class_offerings co
            JOIN courses c ON co.course_id = c.id
            JOIN profiles p ON c.school_id = p.school_id
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 18. Create functions for bulk course creation
CREATE OR REPLACE FUNCTION create_courses_from_template(
    template_id UUID,
    custom_hours_per_grade JSONB DEFAULT NULL
)
RETURNS UUID[] AS $$
DECLARE
    template_record RECORD;
    grade_level INTEGER;
    course_id UUID;
    course_ids UUID[] := '{}';
    hours_config JSONB;
    min_hours INTEGER;
    max_hours INTEGER;
BEGIN
    -- Get template details
    SELECT * INTO template_record FROM course_templates WHERE id = template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;
    
    -- Create courses for each grade level
    FOREACH grade_level IN ARRAY template_record.grade_levels
    LOOP
        -- Get hours configuration for this grade (if provided)
        hours_config := custom_hours_per_grade->grade_level::text;
        min_hours := COALESCE((hours_config->>'min_hours')::INTEGER, template_record.min_hours_per_term);
        max_hours := COALESCE((hours_config->>'max_hours')::INTEGER, template_record.max_hours_per_term);
        
        -- Create course
        INSERT INTO courses (
            name,
            department_id,
            description,
            grade_level,
            grade_label,
            display_name,
            min_hours_per_term,
            max_hours_per_term,
            school_id
        ) VALUES (
            template_record.name,
            template_record.department_id,
            template_record.description,
            grade_level,
            'Grade ' || grade_level,
            template_record.name || ' (Grade ' || grade_level || ')',
            min_hours,
            max_hours,
            template_record.school_id
        ) RETURNING id INTO course_id;
        
        -- Add to array
        course_ids := array_append(course_ids, course_id);
        
        -- Create grade mapping
        INSERT INTO course_grade_mappings (course_id, grade_level)
        VALUES (course_id, grade_level);
    END LOOP;
    
    RETURN course_ids;
END;
$$ LANGUAGE plpgsql;

-- 19. Create function to generate display names
CREATE OR REPLACE FUNCTION generate_course_display_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate display name based on available fields
    IF NEW.code IS NOT NULL AND NEW.code != '' THEN
        NEW.display_name := NEW.name || ' (' || NEW.code || ')';
    ELSIF NEW.grade_label IS NOT NULL AND NEW.grade_label != '' THEN
        NEW.display_name := NEW.name || ' (' || NEW.grade_label || ')';
    ELSE
        NEW.display_name := NEW.name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 20. Create trigger for display name generation
CREATE TRIGGER generate_course_display_name_trigger
    BEFORE INSERT OR UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION generate_course_display_name();

-- 21. Create trigger for teacher workload updates
CREATE TRIGGER update_teacher_workload_trigger
    AFTER INSERT OR UPDATE OR DELETE ON class_offerings
    FOR EACH ROW EXECUTE FUNCTION update_teacher_workload();

-- 22. Create functions for data migration (optional - for existing data)
CREATE OR REPLACE FUNCTION migrate_subjects_to_departments()
RETURNS void AS $$
DECLARE
    subject_record RECORD;
    new_department_id UUID;
BEGIN
    -- Migrate existing subjects to departments
    FOR subject_record IN SELECT * FROM subjects LOOP
        INSERT INTO departments (name, code, description, school_id)
        VALUES (
            subject_record.name,
            CASE 
                WHEN subject_record.code IS NOT NULL AND subject_record.code != '' 
                THEN subject_record.code 
                ELSE UPPER(LEFT(subject_record.name, 3))
            END,
            'Migrated from subjects table',
            subject_record.school_id
        ) RETURNING id INTO new_department_id;
        
        -- Update courses to reference the new department
        UPDATE courses 
        SET department_id = new_department_id 
        WHERE subject_id = subject_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 23. Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_updated_at 
    BEFORE UPDATE ON departments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_grade_mappings_updated_at 
    BEFORE UPDATE ON course_grade_mappings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_templates_updated_at 
    BEFORE UPDATE ON course_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at 
    BEFORE UPDATE ON holidays 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_days_config_updated_at 
    BEFORE UPDATE ON working_days_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 