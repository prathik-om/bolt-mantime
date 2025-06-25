#!/bin/bash

# Backup Configuration Script
# This script helps set up the proper environment for database backup

echo "🔧 Setting up Database Backup Configuration..."
echo "=============================================="

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ Found .env file"
    source .env
else
    echo "⚠️  No .env file found"
    echo "Creating backup configuration..."
fi

# Get project information
PROJECT_ID=$(grep 'project_id' supabase/config.toml | cut -d'=' -f2 | tr -d ' "')
echo "📋 Project ID: $PROJECT_ID"

# Check if linked to remote project
echo "🔗 Checking project linkage..."
if supabase projects list | grep -q "●.*$PROJECT_ID"; then
    echo "✅ Project is linked to remote"
    LINKED=true
else
    echo "⚠️  Project is not linked to remote"
    LINKED=false
fi

# Try to get database URL from Supabase
echo "🔍 Attempting to get database URL..."
if [ "$LINKED" = true ]; then
    # Try to get the database URL from Supabase CLI
    DB_URL=$(supabase db remote commit --help 2>/dev/null | grep -o 'postgresql://[^[:space:]]*' | head -1) || echo ""
    
    if [ ! -z "$DB_URL" ]; then
        echo "✅ Found database URL from Supabase CLI"
        export DATABASE_URL="$DB_URL"
    else
        echo "⚠️  Could not get database URL from CLI"
    fi
fi

# Create environment file for backup
echo "📝 Creating backup environment file..."
cat > backup_env.sh << EOF
#!/bin/bash
# Backup Environment Configuration
# Generated on $(date)

# Project Configuration
export PROJECT_ID="$PROJECT_ID"
export LINKED="$LINKED"

# Database Configuration (if available)
export DATABASE_URL="$DATABASE_URL"

# Supabase Configuration
export NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Backup Configuration
export BACKUP_DIR="backups/\$(date +%Y%m%d_%H%M%S)"
export BACKUP_TIMESTAMP="\$(date +%Y-%m-%d_%H-%M-%S)"

echo "🔧 Backup environment loaded"
echo "📋 Project ID: \$PROJECT_ID"
echo "🔗 Linked: \$LINKED"
echo "📁 Backup Dir: \$BACKUP_DIR"
EOF

chmod +x backup_env.sh

echo ""
echo "📊 CONFIGURATION SUMMARY:"
echo "========================="
echo "Project ID: $PROJECT_ID"
echo "Linked to Remote: $LINKED"
echo "Database URL Set: $([ ! -z "$DATABASE_URL" ] && echo "Yes" || echo "No")"
echo "Environment File: backup_env.sh"

echo ""
echo "🚀 NEXT STEPS:"
echo "=============="

if [ "$LINKED" = true ]; then
    echo "1. Run: source backup_env.sh"
    echo "2. Run: ./create_backup.sh"
    echo "3. If backup fails, try manual connection:"
    echo "   supabase db remote commit --help"
else
    echo "1. Link to remote project:"
    echo "   supabase link --project-ref $PROJECT_ID"
    echo "2. Run: source backup_env.sh"
    echo "3. Run: ./create_backup.sh"
fi

echo ""
echo "🔍 TROUBLESHOOTING:"
echo "=================="
echo "If backup fails:"
echo "1. Check Supabase project status: supabase projects list"
echo "2. Verify project linkage: supabase status"
echo "3. Test connection: supabase db remote commit --help"
echo "4. Check environment variables: env | grep SUPABASE" 