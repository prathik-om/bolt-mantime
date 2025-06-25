#!/bin/bash

# Easy Database Backup Script
# This script uses environment variables for easy database backup

set -e

echo "🚀 Easy Database Backup Process"
echo "==============================="

# Load environment variables
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "⚠️  No .env file found. Please create one from env.template"
    echo "   cp env.template .env"
    echo "   Then edit .env with your database password"
    exit 1
fi

# Create backup directory
BACKUP_DIR="${BACKUP_DIR:-backups}/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📁 Created backup directory: $BACKUP_DIR"

# Function to test database connection
test_connection() {
    local url=$1
    local name=$2
    
    echo "🔍 Testing $name connection..."
    if pg_isready -d "$url" >/dev/null 2>&1; then
        echo "✅ $name connection successful"
        return 0
    else
        echo "❌ $name connection failed"
        return 1
    fi
}

# Try different connection methods
echo "🔗 Testing database connections..."

# Method 1: Try pooler connection
if [ ! -z "$DATABASE_URL" ] && [[ "$DATABASE_URL" != *"YOUR_DATABASE_PASSWORD"* ]]; then
    if test_connection "$DATABASE_URL" "Pooler"; then
        echo "📋 Method 1: Creating backup using pooler connection..."
        if pg_dump --data-only "$DATABASE_URL" > "$BACKUP_DIR/data_backup_pooler.sql" 2>/dev/null; then
            echo "✅ Pooler backup successful: $BACKUP_DIR/data_backup_pooler.sql"
            BACKUP_SUCCESS=true
            BACKUP_FILE="$BACKUP_DIR/data_backup_pooler.sql"
        else
            echo "⚠️  Pooler backup failed"
        fi
    fi
fi

# Method 2: Try direct connection
if [ ! -z "$DATABASE_URL_DIRECT" ] && [[ "$DATABASE_URL_DIRECT" != *"YOUR_DATABASE_PASSWORD"* ]]; then
    if test_connection "$DATABASE_URL_DIRECT" "Direct"; then
        echo "📋 Method 2: Creating backup using direct connection..."
        if pg_dump --data-only "$DATABASE_URL_DIRECT" > "$BACKUP_DIR/data_backup_direct.sql" 2>/dev/null; then
            echo "✅ Direct backup successful: $BACKUP_DIR/data_backup_direct.sql"
            BACKUP_SUCCESS=true
            BACKUP_FILE="$BACKUP_DIR/data_backup_direct.sql"
        else
            echo "⚠️  Direct backup failed"
        fi
    fi
fi

# Method 3: Try Supabase CLI
if [ "$BACKUP_SUCCESS" != true ]; then
    echo "📋 Method 3: Attempting Supabase CLI backup..."
    if supabase db dump --linked --data-only > "$BACKUP_DIR/data_backup_cli.sql" 2>/dev/null; then
        echo "✅ Supabase CLI backup successful: $BACKUP_DIR/data_backup_cli.sql"
        BACKUP_SUCCESS=true
        BACKUP_FILE="$BACKUP_DIR/data_backup_cli.sql"
    else
        echo "⚠️  Supabase CLI backup failed"
    fi
fi

# Create schema backup
echo "📋 Creating schema backup..."
if supabase db dump --linked --schema-only > "$BACKUP_DIR/schema_backup.sql" 2>/dev/null; then
    echo "✅ Schema backup successful: $BACKUP_DIR/schema_backup.sql"
else
    echo "⚠️  Schema backup failed, using local schema file"
    if [ -f "schema_dump.sql" ]; then
        cp schema_dump.sql "$BACKUP_DIR/schema_backup.sql"
        echo "✅ Local schema backup created"
    fi
fi

# Create backup metadata
echo "📋 Creating backup metadata..."
{
    echo "=== BACKUP METADATA ==="
    echo "Backup Date: $(date)"
    echo "Project ID: $SUPABASE_PROJECT_ID"
    echo "Backup Directory: $BACKUP_DIR"
    echo "Backup Success: $BACKUP_SUCCESS"
    echo "Backup File: $BACKUP_FILE"
    echo ""
    echo "=== ENVIRONMENT INFO ==="
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Supabase CLI version: $(supabase --version)"
    echo ""
    echo "=== CONNECTION INFO ==="
    echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
    echo "Database URL Set: $([ ! -z "$DATABASE_URL" ] && echo "Yes" || echo "No")"
    echo "Direct URL Set: $([ ! -z "$DATABASE_URL_DIRECT" ] && echo "Yes" || echo "No")"
} > "$BACKUP_DIR/backup_metadata.txt"

# Verify backup file
if [ "$BACKUP_SUCCESS" = true ] && [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(wc -c < "$BACKUP_FILE")
    echo "📊 Backup file size: $BACKUP_SIZE bytes"
    
    if [ $BACKUP_SIZE -gt 1000 ]; then
        echo "✅ Backup file appears valid (size > 1KB)"
    else
        echo "⚠️  Backup file seems small, may be incomplete"
    fi
fi

# Create backup summary
echo "📋 Creating backup summary..."
{
    echo "=== EASY BACKUP SUMMARY ==="
    echo "Backup Date: $(date)"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    echo "=== BACKUP CONTENTS ==="
    ls -la "$BACKUP_DIR"
    echo ""
    echo "=== BACKUP STATUS ==="
    if [ "$BACKUP_SUCCESS" = true ]; then
        echo "✅ BACKUP SUCCESSFUL"
        echo "   Data backup: $BACKUP_FILE"
        echo "   Schema backup: $BACKUP_DIR/schema_backup.sql"
        echo "   You can proceed with production deployment"
    else
        echo "❌ BACKUP FAILED"
        echo "   Please check your .env file and database credentials"
        echo "   Ensure DATABASE_URL contains your actual password"
    fi
    echo ""
    echo "=== NEXT STEPS ==="
    if [ "$BACKUP_SUCCESS" = true ]; then
        echo "1. ✅ Backup completed successfully"
        echo "2. 🚀 Proceed with production deployment"
        echo "3. 📁 Keep backup files for rollback"
        echo "4. 🔄 Run this script again before future deployments"
    else
        echo "1. 🔧 Check your .env file configuration"
        echo "2. 🔑 Verify your database password"
        echo "3. 🔗 Test database connection manually"
        echo "4. 🔄 Re-run this script after fixing issues"
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