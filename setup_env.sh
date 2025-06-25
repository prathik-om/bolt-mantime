#!/bin/bash

# Environment Setup Script
# This script helps you create the .env file for easy database backup

echo "🔧 Setting up Environment Configuration"
echo "======================================"

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
fi

# Get project information
PROJECT_ID=$(grep 'project_id' supabase/config.toml | cut -d'=' -f2 | tr -d ' "')
echo "📋 Project ID: $PROJECT_ID"

# Create .env file
echo "📝 Creating .env file..."

# Copy template
cp env.template .env

echo "✅ .env file created from template"
echo ""
echo "🔑 NEXT STEPS:"
echo "=============="
echo "1. Edit .env file and replace YOUR_DATABASE_PASSWORD with your actual password"
echo "2. You can find your database password in the Supabase dashboard:"
echo "   https://supabase.com/dashboard/project/$PROJECT_ID/settings/database"
echo ""
echo "3. After setting the password, run the easy backup script:"
echo "   chmod +x easy_backup.sh"
echo "   ./easy_backup.sh"
echo ""
echo "📋 ENVIRONMENT VARIABLES SET:"
echo "============================="
echo "✅ NEXT_PUBLIC_SUPABASE_URL"
echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "✅ SUPABASE_PROJECT_ID"
echo "✅ SUPABASE_PROJECT_REF"
echo "⚠️  DATABASE_URL (needs password)"
echo "⚠️  DATABASE_URL_DIRECT (needs password)"
echo ""
echo "🔍 To edit .env file:"
echo "   nano .env"
echo "   # or"
echo "   code .env"
echo ""
echo "🚀 Ready to create easy backups!" 