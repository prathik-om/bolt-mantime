#!/bin/bash
# Backup Environment Configuration
# Generated on Wed Jun 25 07:48:43 IST 2025

# Project Configuration
export PROJECT_ID="goodrlnbvcjqnddquwrn
my-firebase-project"
export LINKED="true"

# Database Configuration (if available)
export DATABASE_URL=""

# Supabase Configuration
export NEXT_PUBLIC_SUPABASE_URL=""
export NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# Backup Configuration
export BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
export BACKUP_TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

echo "🔧 Backup environment loaded"
echo "📋 Project ID: $PROJECT_ID"
echo "🔗 Linked: $LINKED"
echo "📁 Backup Dir: $BACKUP_DIR"
