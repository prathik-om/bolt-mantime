-- Test connection and basic operations
\echo 'Testing database connection...'

-- Test basic query
SELECT version() as db_version;

-- Test if we can access the database
SELECT current_database() as current_db, current_user as current_user;

-- Test if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name 
LIMIT 10;

\echo 'Connection test completed successfully!' 