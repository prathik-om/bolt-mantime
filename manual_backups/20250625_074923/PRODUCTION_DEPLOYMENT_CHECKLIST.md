# Production Deployment Checklist

## 🚨 **CRITICAL: Pre-Deployment Steps**

### **1. Environment Variables Verification**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- [ ] Database connection string is valid
- [ ] All API keys are properly configured

### **2. Database Backup**
```bash
# Create a complete backup before deployment
supabase db dump --data-only > production_backup_$(date +%Y%m%d_%H%M%S).sql
```

### **3. Local Testing**
- [ ] Test all forms with the new error handling
- [ ] Verify data migration script runs without errors
- [ ] Test constraint violations and error messages
- [ ] Verify all API endpoints work correctly

### **4. Migration Verification**
```bash
# Check migration status
supabase migration list

# Verify all migrations are applied
supabase db diff
```

## 📋 **Deployment Steps**

### **Step 1: Apply Database Migrations**
```bash
# Push all migrations to production
supabase db push

# Verify migrations were applied
supabase migration list
```

### **Step 2: Run Data Migration Script**
```bash
# Connect to production database and run migration script
psql -d your_production_db -f data_migration_and_cleanup.sql

# Check migration report
cat migration_report.txt
```

### **Step 3: Deploy Frontend**
```bash
# Build and deploy the application
npm run build
npm run start
```

### **Step 4: Verify Deployment**
- [ ] Test all admin forms (departments, subjects, academic calendar, etc.)
- [ ] Verify error messages display correctly
- [ ] Test constraint violations
- [ ] Check database constraints are working

## 🔍 **Post-Deployment Verification**

### **1. Database Constraints**
```sql
-- Verify foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('holidays', 'time_slots', 'timetable_generations');

-- Verify check constraints
SELECT 
    constraint_name,
    table_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%_check';
```

### **2. Error Handling Verification**
- [ ] Test duplicate department names
- [ ] Test invalid grade levels
- [ ] Test date range conflicts
- [ ] Test foreign key violations
- [ ] Verify error messages are user-friendly

### **3. Performance Monitoring**
- [ ] Monitor query performance
- [ ] Check for any constraint violation errors
- [ ] Monitor application logs
- [ ] Verify form submissions work correctly

## 🚨 **Rollback Plan**

### **If Issues Occur:**
```bash
# Rollback database migrations
supabase db reset --linked

# Restore from backup
psql -d your_production_db -f production_backup_YYYYMMDD_HHMMSS.sql

# Revert frontend deployment
git checkout HEAD~1
npm run build
npm run start
```

## ✅ **Success Criteria**

After deployment, verify:
- [ ] All forms work without errors
- [ ] Error messages are clear and actionable
- [ ] Database constraints prevent invalid data
- [ ] Performance is acceptable
- [ ] No data loss occurred
- [ ] All API endpoints respond correctly

## 📞 **Emergency Contacts**

- **Database Issues**: Check Supabase logs
- **Frontend Issues**: Check application logs
- **Migration Issues**: Review migration_report.txt
- **Performance Issues**: Monitor query execution plans

## 🎯 **Expected Benefits**

After successful deployment:
- ✅ **Better user experience** with clear error messages
- ✅ **Data integrity** with database-level constraints
- ✅ **Improved performance** with optimized queries
- ✅ **Easier maintenance** with centralized error handling
- ✅ **Reliable scheduling** with consistent data validation 