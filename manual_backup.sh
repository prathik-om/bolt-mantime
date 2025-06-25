#!/bin/bash

# Manual Database Backup Script
# This script provides multiple backup methods when automatic backup fails

set -e

echo "🔧 Manual Database Backup Process"
echo "================================="

# Create backup directory
BACKUP_DIR="manual_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📁 Created backup directory: $BACKUP_DIR"

# Method 1: Try to get connection info from Supabase dashboard
echo "📋 Method 1: Creating connection info backup..."
{
    echo "=== SUPABASE CONNECTION INFORMATION ==="
    echo "Backup Date: $(date)"
    echo "Project ID: $(grep 'project_id' supabase/config.toml | cut -d'=' -f2 | tr -d ' "')"
    echo ""
    echo "=== CONNECTION DETAILS ==="
    echo "To get database connection details:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your project: $(grep 'project_id' supabase/config.toml | cut -d'=' -f2 | tr -d ' "')"
    echo "3. Go to Settings > Database"
    echo "4. Copy the connection string"
    echo ""
    echo "=== BACKUP COMMANDS ==="
    echo "Once you have the connection string, run:"
    echo "pg_dump --data-only 'YOUR_CONNECTION_STRING' > $BACKUP_DIR/data_backup.sql"
    echo ""
    echo "=== ALTERNATIVE METHODS ==="
    echo "If pg_dump fails, try:"
    echo "1. Use Supabase Studio to export data"
    echo "2. Use the SQL editor to run: SELECT * FROM table_name;"
    echo "3. Copy results to CSV files"
} > "$BACKUP_DIR/connection_guide.txt"

# Method 2: Create schema backup from local files
echo "📋 Method 2: Creating schema backup from local files..."
if [ -f "schema_dump.sql" ]; then
    cp schema_dump.sql "$BACKUP_DIR/schema_backup.sql"
    echo "✅ Schema backup created from local file"
else
    echo "⚠️  No local schema file found"
fi

# Method 3: Export current migration state
echo "📋 Method 3: Exporting migration state..."
{
    echo "=== MIGRATION STATE ==="
    echo "Backup Date: $(date)"
    echo ""
    echo "=== MIGRATION FILES ==="
    ls -la supabase/migrations/ 2>/dev/null || echo "No migrations directory found"
    echo ""
    echo "=== CURRENT MIGRATIONS ==="
    find supabase/migrations/ -name "*.sql" -type f | sort 2>/dev/null || echo "No migration files found"
} > "$BACKUP_DIR/migration_state.txt"

# Method 4: Create application state backup
echo "📋 Method 4: Creating application state backup..."
{
    echo "=== APPLICATION STATE ==="
    echo "Backup Date: $(date)"
    echo ""
    echo "=== PACKAGE VERSIONS ==="
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Supabase CLI version: $(supabase --version)"
    echo ""
    echo "=== PROJECT CONFIGURATION ==="
    echo "Project ID: $(grep 'project_id' supabase/config.toml | cut -d'=' -f2 | tr -d ' "')"
    echo "Database Major Version: $(grep 'major_version' supabase/config.toml | cut -d'=' -f2 | tr -d ' "')"
    echo ""
    echo "=== ENVIRONMENT VARIABLES ==="
    env | grep -E "(SUPABASE|DATABASE|NEXT_PUBLIC)" | sort || echo "No relevant environment variables found"
} > "$BACKUP_DIR/application_state.txt"

# Method 5: Create deployment checklist backup
echo "📋 Method 5: Creating deployment checklist backup..."
if [ -f "PRODUCTION_DEPLOYMENT_CHECKLIST.md" ]; then
    cp PRODUCTION_DEPLOYMENT_CHECKLIST.md "$BACKUP_DIR/"
    echo "✅ Deployment checklist backed up"
fi

# Method 6: Create data migration script backup
echo "📋 Method 6: Creating data migration script backup..."
if [ -f "data_migration_and_cleanup.sql" ]; then
    cp data_migration_and_cleanup.sql "$BACKUP_DIR/"
    echo "✅ Data migration script backed up"
fi

# Create comprehensive backup summary
echo "📋 Creating comprehensive backup summary..."
{
    echo "=== MANUAL BACKUP SUMMARY ==="
    echo "Backup Date: $(date)"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    echo "=== BACKUP CONTENTS ==="
    ls -la "$BACKUP_DIR"
    echo ""
    echo "=== BACKUP STATUS ==="
    echo "⚠️  MANUAL BACKUP REQUIRED"
    echo "   Database connection failed, manual steps needed"
    echo ""
    echo "=== MANUAL BACKUP STEPS ==="
    echo "1. Get database connection string from Supabase dashboard"
    echo "2. Run: pg_dump --data-only 'CONNECTION_STRING' > $BACKUP_DIR/data_backup.sql"
    echo "3. Verify backup file size is not empty"
    echo "4. Test backup by creating a test database and importing"
    echo ""
    echo "=== ALTERNATIVE BACKUP METHODS ==="
    echo "If pg_dump fails:"
    echo "1. Use Supabase Studio > SQL Editor"
    echo "2. Export each table individually:"
    echo "   - SELECT * FROM schools;"
    echo "   - SELECT * FROM academic_years;"
    echo "   - SELECT * FROM terms;"
    echo "   - SELECT * FROM departments;"
    echo "   - SELECT * FROM courses;"
    echo "   - SELECT * FROM teachers;"
    echo "   - SELECT * FROM classes;"
    echo "   - SELECT * FROM class_offerings;"
    echo "   - SELECT * FROM teaching_assignments;"
    echo "3. Save results as CSV files"
    echo ""
    echo "=== NEXT STEPS ==="
    echo "1. Complete manual database backup"
    echo "2. Verify backup integrity"
    echo "3. Proceed with production deployment"
    echo "4. Keep backup files for rollback"
} > "$BACKUP_DIR/backup_summary.txt"

echo ""
echo "📊 MANUAL BACKUP SUMMARY:"
cat "$BACKUP_DIR/backup_summary.txt"

echo ""
echo "🎯 IMMEDIATE ACTION REQUIRED:"
echo "============================="
echo "1. 📋 Read connection guide: cat $BACKUP_DIR/connection_guide.txt"
echo "2. 🔗 Get database connection string from Supabase dashboard"
echo "3. 💾 Run manual backup command with your connection string"
echo "4. ✅ Verify backup file is created and not empty"
echo ""
echo "📁 Backup files saved in: $BACKUP_DIR"
echo "🔍 View backup contents: ls -la $BACKUP_DIR" 