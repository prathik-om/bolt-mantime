-- Find duplicate unique constraints (same columns, more than one constraint) in public schema
WITH unique_constraints AS (
  SELECT
    c.conname AS constraint_name,
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
SELECT
  table_name,
  columns,
  array_agg(constraint_name) AS constraint_names,
  COUNT(*) AS num_constraints
FROM unique_constraints
GROUP BY table_name, columns
HAVING COUNT(*) > 1
ORDER BY table_name, columns;

-- Show all unique constraints for manual review
WITH unique_constraints AS (
  SELECT
    c.conname AS constraint_name,
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
SELECT
  table_name,
  constraint_name,
  columns
FROM unique_constraints
ORDER BY table_name, constraint_name; 