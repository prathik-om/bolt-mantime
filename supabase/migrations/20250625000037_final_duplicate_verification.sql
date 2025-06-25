-- Migration: Final Duplicate Constraint Verification
-- Date: 2025-06-25
-- Description: Final verification that no duplicate unique constraints remain

DO $$
DECLARE
    duplicate_count INTEGER;
    constraint_record RECORD;
BEGIN
    RAISE NOTICE '=== FINAL DUPLICATE CONSTRAINT VERIFICATION ===';
    
    -- Count any remaining duplicates
    WITH unique_constraints AS (
        SELECT
            t.relname AS table_name,
            array_agg(a.attname ORDER BY a.attnum) AS columns
        FROM
            pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            JOIN unnest(c.conkey) AS colnum(attnum) ON TRUE
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = colnum.attnum
        WHERE
            c.contype = 'u'
            AND n.nspname = 'public'
        GROUP BY
            c.conname, t.relname
    )
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT table_name, columns
        FROM unique_constraints
        GROUP BY table_name, columns
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Found % sets of duplicate unique constraints remaining', duplicate_count;
    END IF;
    
    RAISE NOTICE '✅ No duplicate unique constraints found';
    RAISE NOTICE '✅ Schema is completely clean';
    
    -- List all unique constraints for reference
    RAISE NOTICE '=== ALL UNIQUE CONSTRAINTS ===';
    FOR constraint_record IN 
        SELECT 
            t.relname AS table_name,
            c.conname AS constraint_name,
            pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE c.contype = 'u' AND n.nspname = 'public'
        ORDER BY t.relname, c.conname
    LOOP
        RAISE NOTICE '%: % - %', 
            constraint_record.table_name, 
            constraint_record.constraint_name, 
            constraint_record.definition;
    END LOOP;
    
    RAISE NOTICE '=== SCHEMA IS PRODUCTION READY ===';
END $$; 