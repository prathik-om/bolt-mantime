-- Migration: Remove Duplicate Unique Constraint from classes
-- Date: 2025-06-25
-- Description: Drop the duplicate unique constraint on (school_id, grade_level, name) from classes table

BEGIN;

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_school_id_grade_level_name_key;
-- Keep: classes_school_grade_name_unique

COMMIT; 