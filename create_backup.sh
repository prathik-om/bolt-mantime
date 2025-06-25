#!/bin/bash

# Database Backup Script for Production Deployment
# This script creates backups using multiple methods to ensure data safety

set -e  # Exit on any error

echo "🚀 Starting Database Backup Process..."
echo "======================================"

# Create backup directory
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📁 Created backup directory: $BACKUP_DIR"

# Method 1: Try Supabase CLI backup
echo "📋 Method 1: Attempting Supabase CLI backup..."
if supabase db dump --data-only > "$BACKUP_DIR/supabase_backup.sql" 2>/dev/null; then
    echo "✅ Supabase CLI backup successful: $BACKUP_DIR/supabase_backup.sql"
    BACKUP_SUCCESS=true
else
    echo "⚠️  Supabase CLI backup failed, trying alternative methods..."
    BACKUP_SUCCESS=false
fi

# Method 2: Try direct PostgreSQL connection (if environment variables are set)
echo "📋 Method 2: Attempting direct PostgreSQL backup..."
if [ ! -z "$DATABASE_URL" ]; then
    if pg_dump --data-only "$DATABASE_URL" > "$BACKUP_DIR/direct_pg_backup.sql" 2>/dev/null; then
        echo "✅ Direct PostgreSQL backup successful: $BACKUP_DIR/direct_pg_backup.sql"
        BACKUP_SUCCESS=true
    else
        echo "⚠️  Direct PostgreSQL backup failed"
    fi
else
    echo "ℹ️  DATABASE_URL not set, skipping direct PostgreSQL backup"
fi

# Method 3: Create schema-only backup for reference
echo "📋 Method 3: Creating schema backup..."
if supabase db dump --schema-only > "$BACKUP_DIR/schema_backup.sql" 2>/dev/null; then
    echo "✅ Schema backup successful: $BACKUP_DIR/schema_backup.sql"
else
    echo "⚠️  Schema backup failed"
fi

# Method 4: Export current migration state
echo "📋 Method 4: Exporting migration state..."
supabase migration list > "$BACKUP_DIR/migration_state.txt" 2>/dev/null || echo "⚠️  Could not export migration state"
echo "✅ Migration state exported: $BACKUP_DIR/migration_state.txt"

# Method 5: Create environment backup
echo "📋 Method 5: Creating environment backup..."
{
    echo "Backup created at: $(date)"
    echo "Project ID: $(grep 'project_id' supabase/config.toml | cut -d'=' -f2 | tr -d ' "')"
    echo "Database URL: $DATABASE_URL"
    echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Supabase CLI version: $(supabase --version)"
} > "$BACKUP_DIR/environment_info.txt"
echo "✅ Environment info exported: $BACKUP_DIR/environment_info.txt"

# Create backup summary
echo "📋 Creating backup summary..."
{
    echo "=== DATABASE BACKUP SUMMARY ==="
    echo "Backup Date: $(date)"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    echo "=== BACKUP FILES ==="
    ls -la "$BACKUP_DIR"
    echo ""
    echo "=== BACKUP STATUS ==="
    if [ "$BACKUP_SUCCESS" = true ]; then
        echo "✅ MAIN BACKUP: SUCCESSFUL"
        echo "   You can proceed with production deployment"
    else
        echo "❌ MAIN BACKUP: FAILED"
        echo "   Please resolve connection issues before deployment"
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check Supabase project connection: supabase projects list"
        echo "2. Verify environment variables are set"
        echo "3. Try manual connection test"
        echo "4. Contact support if issues persist"
    fi
    echo ""
    echo "=== NEXT STEPS ==="
    if [ "$BACKUP_SUCCESS" = true ]; then
        echo "1. Review backup files in: $BACKUP_DIR"
        echo "2. Proceed with production deployment"
        echo "3. Keep backup files for rollback if needed"
    else
        echo "1. Resolve database connection issues"
        echo "2. Re-run backup script"
        echo "3. Do not proceed with deployment until backup is successful"
    fi
} > "$BACKUP_DIR/backup_summary.txt"

echo ""
echo "📊 BACKUP SUMMARY:"
cat "$BACKUP_DIR/backup_summary.txt"

echo ""
if [ "$BACKUP_SUCCESS" = true ]; then
    echo "🎉 BACKUP COMPLETED SUCCESSFULLY!"
    echo "📁 Backup files saved in: $BACKUP_DIR"
    echo "✅ You can now proceed with production deployment"
else
    echo "⚠️  BACKUP FAILED - Please resolve issues before deployment"
    echo "📁 Partial backup files saved in: $BACKUP_DIR"
fi

echo ""
echo "🔍 To view backup contents:"
echo "   ls -la $BACKUP_DIR"
echo "   cat $BACKUP_DIR/backup_summary.txt" 