# Schema Optimization Deployment Guide

## 🚨 **IMPORTANT: Safe Deployment Strategy**

### **Why This Approach is Recommended:**

1. **Migration-based**: Uses Supabase's migration system
2. **Rollback capability**: Can undo changes if needed
3. **Error handling**: Checks for existing constraints/columns
4. **Transaction safety**: All changes in single transaction
5. **No data loss**: Safe for production databases

## 📋 **Deployment Steps**

### **Step 1: Backup Your Database**
```bash
# Create a backup before applying changes
supabase db dump --data-only > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **Step 2: Test Locally First**
```bash
# Start local Supabase
supabase start

# Apply the migration locally
supabase db reset

# Test your application locally
npm run dev
```

### **Step 3: Apply to Production**
```bash
# Push the migration to production
supabase db push

# Or if you prefer to apply manually:
supabase db push --include-all
```

### **Step 4: Verify the Changes**
```sql
-- Check if foreign keys were added
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'scheduled_lessons';

-- Check if indexes were created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename = 'scheduled_lessons'
ORDER BY indexname;

-- Check if functions were created
SELECT 
    proname,
    prosrc
FROM pg_proc
WHERE proname IN (
    'get_teacher_scheduled_times',
    'get_teacher_constraints',
    'get_term_offerings',
    'get_offering_scheduled_count',
    'check_teacher_conflict',
    'validate_scheduled_lesson'
);
```

## 🔄 **Rollback Procedure (If Needed)**

### **If Something Goes Wrong:**
```bash
# Apply the rollback migration
supabase db push

# Or manually run the rollback SQL
psql -d your_database -f supabase/migrations/20250625000017_rollback_schema_optimization.sql
```

## ⚠️ **Important Notes**

### **Before Deployment:**
1. **Test thoroughly** in local environment
2. **Backup your database** 
3. **Check for existing data** that might conflict
4. **Verify your application** works with new functions

### **After Deployment:**
1. **Test all functionality** in production
2. **Monitor performance** for any issues
3. **Check logs** for any errors
4. **Update your API layer** to use new functions

## 🛠️ **API Layer Updates**

### **Update Your Existing API Functions:**

```typescript
// Before: Complex joins in database
const curriculumData = await supabase
  .from('class_offerings')
  .select(`
    *,
    classes(name),
    courses(name, departments(name)),
    teaching_assignments(teachers(first_name, last_name))
  `)
  .eq('term_id', termId);

// After: Use simple functions
const offerings = await supabase.rpc('get_term_offerings', { p_term_id: termId });
const scheduledCounts = await Promise.all(
  offerings.data.map(offering => 
    supabase.rpc('get_offering_scheduled_count', { p_offering_id: offering.offering_id })
  )
);
```

### **Update Timetable API:**

```typescript
// Use new helper functions
export async function getTimetableData(termId: string, schoolId: string) {
  const { data: offerings } = await supabase.rpc('get_term_offerings', { 
    p_term_id: termId 
  });
  
  const { data: schedule } = await supabase.rpc('get_schedule_for_dates', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_school_id: schoolId
  });
  
  return { offerings, schedule };
}
```

## 📊 **Performance Monitoring**

### **Monitor These Metrics:**
1. **Query performance** for timetable generation
2. **Memory usage** of your application
3. **Database connection** pool usage
4. **Error rates** in your logs

### **Expected Improvements:**
- **Faster conflict checking**: Simple EXISTS queries
- **Better scalability**: No complex joins
- **Easier debugging**: Clear function purposes
- **Reduced memory usage**: No materialized views

## 🚀 **Next Steps After Deployment**

### **1. Update Your AI Scheduling Logic:**
```typescript
// Use the new simple functions for AI scheduling
async function generateSchedule(termId: string) {
  const offerings = await getTermOfferings(termId);
  
  for (const offering of offerings) {
    const scheduledCount = await getOfferingScheduledCount(offering.offering_id);
    
    while (scheduledCount < offering.periods_per_week) {
      // Find available slot
      const availableSlot = await findAvailableSlot(offering.teacher_id, date);
      
      // Validate before scheduling
      const validation = await validateScheduledLesson(
        offering.offering_id, 
        date, 
        availableSlot.id
      );
      
      if (validation.is_valid) {
        await createScheduledLesson(offering.offering_id, date, availableSlot.id);
      }
    }
  }
}
```

### **2. Add Progress Tracking:**
```typescript
// Use the new progress tracking
const generation = await createTimetableGeneration(termId);
await updateGenerationProgress(termId);

// Monitor progress
const progress = await getGenerationProgress(generation.id);
console.log(`Progress: ${progress.scheduled_lessons}/${progress.total_offerings}`);
```

## ✅ **Success Criteria**

After deployment, you should see:
- ✅ **No errors** in application logs
- ✅ **Faster timetable generation** 
- ✅ **Better conflict detection**
- ✅ **Improved scalability**
- ✅ **Easier maintenance**

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **Foreign key constraint errors**:
   - Check if existing data violates constraints
   - Clean up orphaned records first

2. **Function not found errors**:
   - Verify migration was applied successfully
   - Check function names match exactly

3. **Performance issues**:
   - Monitor query execution plans
   - Check if indexes are being used

### **Get Help:**
- Check Supabase logs: `supabase logs`
- Review migration status: `supabase migration list`
- Test functions directly in Supabase Studio

## 🎯 **Conclusion**

This deployment approach ensures:
- **Safety**: No data loss risk
- **Reversibility**: Can rollback if needed  
- **Performance**: Optimized for AI scheduling
- **Maintainability**: Clear, simple functions

Follow the steps carefully and test thoroughly before applying to production! 