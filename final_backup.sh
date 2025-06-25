#!/bin/bash

# Final Database Backup Script
# This script creates a comprehensive backup using multiple methods

set -e

echo "🎯 Final Database Backup Process"
echo "================================"

# Load environment variables
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
fi

# Create backup directory
BACKUP_DIR="final_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📁 Created backup directory: $BACKUP_DIR"

# Method 1: Try Supabase CLI with linked project
echo "📋 Method 1: Attempting Supabase CLI backup with linked project..."
if supabase db dump --linked --data-only > "$BACKUP_DIR/data_backup.sql" 2>/dev/null; then
    BACKUP_SIZE=$(wc -c < "$BACKUP_DIR/data_backup.sql")
    if [ $BACKUP_SIZE -gt 1000 ]; then
        echo "✅ Supabase CLI backup successful: $BACKUP_DIR/data_backup.sql ($BACKUP_SIZE bytes)"
        BACKUP_SUCCESS=true
        BACKUP_FILE="$BACKUP_DIR/data_backup.sql"
    else
        echo "⚠️  Supabase CLI backup file too small ($BACKUP_SIZE bytes), may be incomplete"
    fi
else
    echo "❌ Supabase CLI backup failed"
fi

# Method 2: Try manual connection with different password formats
if [ "$BACKUP_SUCCESS" != true ]; then
    echo "📋 Method 2: Attempting manual connection with different password formats..."
    
    # Try different password encodings
    PASSWORDS=(
        "Pra@51203455"
        "Pra%4051203455"
        "Pra%254051203455"
    )
    
    for password in "${PASSWORDS[@]}"; do
        echo "🔍 Testing password format: ${password:0:3}***"
        
        # Try pooler connection
        POOLER_URL="postgresql://postgres:${password}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
        if pg_dump --data-only "$POOLER_URL" > "$BACKUP_DIR/data_backup_pooler_${password:0:3}.sql" 2>/dev/null; then
            BACKUP_SIZE=$(wc -c < "$BACKUP_DIR/data_backup_pooler_${password:0:3}.sql")
            if [ $BACKUP_SIZE -gt 1000 ]; then
                echo "✅ Pooler backup successful with password format ${password:0:3}***"
                BACKUP_SUCCESS=true
                BACKUP_FILE="$BACKUP_DIR/data_backup_pooler_${password:0:3}.sql"
                break
            fi
        fi
        
        # Try direct connection
        DIRECT_URL="postgresql://postgres:${password}@db.goodrlnbvcjqnddquwrn.supabase.co:5432/postgres"
        if pg_dump --data-only "$DIRECT_URL" > "$BACKUP_DIR/data_backup_direct_${password:0:3}.sql" 2>/dev/null; then
            BACKUP_SIZE=$(wc -c < "$BACKUP_DIR/data_backup_direct_${password:0:3}.sql")
            if [ $BACKUP_SIZE -gt 1000 ]; then
                echo "✅ Direct backup successful with password format ${password:0:3}***"
                BACKUP_SUCCESS=true
                BACKUP_FILE="$BACKUP_DIR/data_backup_direct_${password:0:3}.sql"
                break
            fi
        fi
    done
fi

# Method 3: Create comprehensive backup package
echo "📋 Method 3: Creating comprehensive backup package..."

# Copy schema backup
if [ -f "schema_dump.sql" ]; then
    cp schema_dump.sql "$BACKUP_DIR/schema_backup.sql"
    echo "✅ Schema backup created"
fi

# Copy migration files
if [ -d "supabase/migrations" ]; then
    cp -r supabase/migrations "$BACKUP_DIR/"
    echo "✅ Migration files backed up"
fi

# Copy important configuration files
cp supabase/config.toml "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  Could not copy config.toml"
cp package.json "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  Could not copy package.json"
cp data_migration_and_cleanup.sql "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  Could not copy migration script"

# Create backup instructions
echo "📋 Creating backup instructions..."
{
    echo "=== BACKUP INSTRUCTIONS ==="
    echo "Backup Date: $(date)"
    echo "Project ID: $SUPABASE_PROJECT_ID"
    echo ""
    echo "=== MANUAL BACKUP STEPS ==="
    echo "If automatic backup failed, follow these steps:"
    echo ""
    echo "1. Go to Supabase Dashboard:"
    echo "   https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID"
    echo ""
    echo "2. Navigate to SQL Editor and run these queries:"
    echo "   -- Export schools"
    echo "   SELECT * FROM schools;"
    echo ""
    echo "   -- Export academic_years"
    echo "   SELECT * FROM academic_years;"
    echo ""
    echo "   -- Export terms"
    echo "   SELECT * FROM terms;"
    echo ""
    echo "   -- Export departments"
    echo "   SELECT * FROM departments;"
    echo ""
    echo "   -- Export courses"
    echo "   SELECT * FROM courses;"
    echo ""
    echo "   -- Export teachers"
    echo "   SELECT * FROM teachers;"
    echo ""
    echo "   -- Export classes"
    echo "   SELECT * FROM classes;"
    echo ""
    echo "   -- Export class_offerings"
    echo "   SELECT * FROM class_offerings;"
    echo ""
    echo "   -- Export teaching_assignments"
    echo "   SELECT * FROM teaching_assignments;"
    echo ""
    echo "3. Save each result as CSV files in this directory"
    echo ""
    echo "=== BACKUP STATUS ==="
    if [ "$BACKUP_SUCCESS" = true ]; then
        echo "✅ AUTOMATIC BACKUP SUCCESSFUL"
        echo "   File: $BACKUP_FILE"
        echo "   Size: $(wc -c < "$BACKUP_FILE") bytes"
    else
        echo "❌ AUTOMATIC BACKUP FAILED"
        echo "   Manual backup required"
    fi
} > "$BACKUP_DIR/backup_instructions.txt"

# Create final summary
echo "📋 Creating final summary..."
{
    echo "=== FINAL BACKUP SUMMARY ==="
    echo "Backup Date: $(date)"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    echo "=== BACKUP CONTENTS ==="
    ls -la "$BACKUP_DIR"
    echo ""
    echo "=== BACKUP STATUS ==="
    if [ "$BACKUP_SUCCESS" = true ]; then
        echo "🎉 BACKUP SUCCESSFUL!"
        echo "   Data backup: $BACKUP_FILE"
        echo "   Schema backup: $BACKUP_DIR/schema_backup.sql"
        echo "   Instructions: $BACKUP_DIR/backup_instructions.txt"
        echo ""
        echo "✅ You can proceed with production deployment"
    else
        echo "⚠️  AUTOMATIC BACKUP FAILED"
        echo "   Manual backup required - see backup_instructions.txt"
        echo ""
        echo "📋 Manual backup files created:"
        echo "   - Schema backup: $BACKUP_DIR/schema_backup.sql"
        echo "   - Migration files: $BACKUP_DIR/migrations/"
        echo "   - Instructions: $BACKUP_DIR/backup_instructions.txt"
    fi
    echo ""
    echo "=== NEXT STEPS ==="
    if [ "$BACKUP_SUCCESS" = true ]; then
        echo "1. ✅ Backup completed successfully"
        echo "2. 🚀 Proceed with production deployment"
        echo "3. 📁 Keep backup files for rollback"
    else
        echo "1. 📋 Follow manual backup instructions"
        echo "2. 💾 Export data from Supabase Studio"
        echo "3. 🚀 Proceed with production deployment after manual backup"
    fi
} > "$BACKUP_DIR/final_summary.txt"

echo ""
echo "📊 FINAL BACKUP SUMMARY:"
cat "$BACKUP_DIR/final_summary.txt"

echo ""
if [ "$BACKUP_SUCCESS" = true ]; then
    echo "🎉 BACKUP COMPLETED SUCCESSFULLY!"
    echo "📁 Backup files saved in: $BACKUP_DIR"
    echo "✅ You can now proceed with production deployment"
else
    echo "⚠️  AUTOMATIC BACKUP FAILED - Manual backup required"
    echo "📁 Backup package created in: $BACKUP_DIR"
    echo "📋 Follow instructions in: $BACKUP_DIR/backup_instructions.txt"
fi

echo ""
echo "🔍 To view backup contents:"
echo "   ls -la $BACKUP_DIR"
echo "   cat $BACKUP_DIR/final_summary.txt" 