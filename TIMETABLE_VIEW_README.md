# Timetable View Implementation

## Overview

This document describes the implementation of the timetable view page that displays scheduled lessons from the `scheduled_lessons` table.

## Features

### 1. **Timetable View Page**
- **Location**: `/admin/timetables`
- **Access**: Admin users only
- **Purpose**: View and manage generated class schedules

### 2. **Key Components**

#### API Layer (`src/lib/api/timetables.ts`)
- `getScheduledLessons()` - Fetches scheduled lessons with complex joins
- `getTimetableGenerations()` - Fetches timetable generation history
- `getClassesForSchool()` - Fetches classes for filtering
- `getTeachersForSchool()` - Fetches teachers for filtering
- `getTermsForSchool()` - Fetches terms for filtering
- Utility functions for formatting dates and times

#### Main Page (`src/app/admin/timetables/page.tsx`)
- Server-side authentication and authorization
- School ID validation
- Renders the client UI component

#### Client UI (`src/app/admin/timetables/_components/TimetablesClientUI.tsx`)
- Interactive timetable display
- Filtering capabilities
- Export functionality
- Statistics dashboard
- Lesson details modal

### 3. **Data Structure**

The timetable view displays data from the `scheduled_lessons` table with the following relationships:

```sql
scheduled_lessons
├── teaching_assignments
│   ├── teachers (first_name, last_name, email)
│   └── class_offerings
│       ├── courses (name, code, departments)
│       └── classes (name, grade_level)
└── time_slots (day_of_week, start_time, end_time, period_number, slot_name)
```

### 4. **Features**

#### **Statistics Dashboard**
- Total lessons count
- Unique teachers count
- Unique classes count
- Unique courses count

#### **Filtering Options**
- Term selection
- Class selection
- Teacher selection
- Day of week selection
- Date range (planned for future)

#### **Table View**
- Date and day display
- Time slots with formatted times
- Teacher information (name and email)
- Course details (name and code)
- Class information (grade and name)
- Department badges
- Action buttons for lesson details

#### **Export Functionality**
- CSV export with all lesson data
- Formatted for easy spreadsheet import

#### **Lesson Details Modal**
- Comprehensive lesson information
- Formatted display of all lesson attributes

### 5. **Navigation Integration**

The timetable view is integrated into both navigation systems:

#### **Admin Navigation** (`src/app/admin/admin-navbar.tsx`)
- Added "Timetables" link with table icon
- Points to `/admin/timetables`

#### **Main Navigation** (`src/components/navigation/navigation.tsx`)
- Updated existing "Timetables" link
- Now points to `/admin/timetables`

### 6. **Testing Support**

#### **Test Data Button**
- "Add Test Data" button for development/testing
- Creates sample scheduled lessons
- Requires existing time slots and teaching assignments
- Prevents duplicate test data

### 7. **Database Requirements**

The timetable view requires the following data to be set up:

1. **Time Slots** - Defined teaching periods
2. **Teaching Assignments** - Teacher-course-class mappings
3. **Scheduled Lessons** - Actual timetable entries (can be generated via AI or manually)

### 8. **Usage Instructions**

1. **Access the Page**
   - Navigate to `/admin/timetables`
   - Must be logged in as admin user

2. **View Timetable**
   - Page loads all scheduled lessons automatically
   - Statistics are displayed at the top

3. **Filter Data**
   - Click "Show Filters" to expand filter options
   - Select filters and click "Apply Filters"
   - Use "Clear All" to reset filters

4. **Export Data**
   - Click "Export CSV" to download timetable data
   - File includes all visible lessons

5. **View Lesson Details**
   - Click the eye icon in any lesson row
   - Modal shows comprehensive lesson information

6. **Add Test Data** (Development)
   - Click "Add Test Data" to populate sample lessons
   - Requires existing time slots and teaching assignments

### 9. **Future Enhancements**

Planned features for future iterations:

1. **Calendar View**
   - Weekly/monthly calendar display
   - Drag-and-drop lesson rescheduling

2. **Advanced Filtering**
   - Date range filters
   - Room-based filtering
   - Department-based filtering

3. **Print Functionality**
   - PDF export
   - Print-friendly layouts

4. **Real-time Updates**
   - WebSocket integration for live updates
   - Conflict detection and alerts

5. **Bulk Operations**
   - Bulk lesson deletion
   - Bulk lesson editing
   - Import functionality

### 10. **Technical Notes**

#### **Performance Considerations**
- Complex joins are handled at the database level
- Pagination can be added for large datasets
- Indexes should be created on frequently filtered columns

#### **Security**
- Row-level security (RLS) policies apply
- Users can only see data for their school
- Admin role required for access

#### **Error Handling**
- Comprehensive error handling for database operations
- User-friendly error messages via toast notifications
- Graceful fallbacks for missing data

## Conclusion

The timetable view provides a comprehensive interface for viewing and managing scheduled lessons. It integrates seamlessly with the existing system architecture and provides a solid foundation for future enhancements. 