-- Add teaching hours fields to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS total_hours_per_year INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS hours_distribution_type TEXT DEFAULT 'equal' CHECK (hours_distribution_type IN ('equal', 'custom')),
ADD COLUMN IF NOT EXISTS term_hours JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN courses.total_hours_per_year IS 'Total teaching hours for this course across the academic year';
COMMENT ON COLUMN courses.hours_distribution_type IS 'How hours are distributed across terms: equal or custom';
COMMENT ON COLUMN courses.term_hours IS 'JSON object with custom hours per term (e.g., {"term1": 40, "term2": 40, "term3": 40})';

-- Add index for better performance on hours queries
CREATE INDEX IF NOT EXISTS idx_courses_total_hours ON courses(total_hours_per_year);
