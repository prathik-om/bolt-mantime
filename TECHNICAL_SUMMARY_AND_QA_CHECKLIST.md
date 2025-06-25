# Technical Summary: Data Integrity & Single Source of Truth for OR-Tools Scheduling

## Overview
This release implements robust data integrity and single source of truth guarantees for all core scheduling entities, ensuring reliable and unambiguous input for Google OR-Tools timetable generation. All business logic, validation, and database constraints are aligned with the CEO's requirements for MVP reliability.

---

## Key Guarantees & Architecture

### 1. **Academic Calendar & Schedulable Periods**
- **Single source of truth:**
  - `academic_years` and `terms` define the scheduling window.
  - `holidays` (school-specific) remove days from the available set.
  - `time_slots` is the only source for daily periods; `is_teaching_period` and breaks are strictly enforced.
- **API & DB:**
  - All available periods for OR-Tools are derived from `time_slots`, filtered for teaching periods and holidays.

### 2. **Period Duration Consistency**
- **Definitive value:** `terms.period_duration_minutes` (not `schools.period_duration`).
- **Validation:**
  - All `time_slots` for a term must match (within 5 min) the term's period duration.
  - DB check constraints and validation functions enforce this.

### 3. **Class/Course Requirements**
- **Single source of truth:**
  - `class_offerings.periods_per_week` and `required_hours_per_term` are the only values used for scheduling.
  - `subject_grade_mappings` and `courses` provide templates/guidelines only.
- **Auto-calculation:**
  - If `required_hours_per_term` is not set, it is auto-calculated from `periods_per_week` and the term's duration.
  - Validation ensures consistency with course-level guidelines.

### 4. **Teacher Workload & Assignment Integrity**
- **Workload validation:**
  - Teacher assignments are checked against `max_periods_per_week`.
  - Overloads are detected and prevented.

### 5. **OR-Tools Data Preparation**
- **Available slots:**
  - Derived from `time_slots`, filtered for teaching periods and holidays.
- **Requirements:**
  - Pulled directly from `class_offerings` (periods or hours).
- **All data is pre-computed and validated before being fed to OR-Tools.**

---

# QA Checklist: Data Integrity & Scheduling

## Academic Calendar & Periods
- [ ] No duplicate academic years or terms for a school (name or date overlap)
- [ ] All holidays are school-specific; same date can be a holiday for one school but not another
- [ ] All time slots for a school/day are unique (no duplicate start/end or period number)
- [ ] All time slots for a term match the term's period duration (±5 min)
- [ ] Breaks and non-teaching periods are correctly flagged in `time_slots`

## Class/Course Requirements
- [ ] No duplicate class_offerings for the same term/class/course
- [ ] All class_offerings have valid, positive `periods_per_week` and (if set) non-negative `required_hours_per_term`
- [ ] If `required_hours_per_term` is not set, it is auto-calculated and matches the expected value
- [ ] Class and course grade levels and school IDs match for each class_offering
- [ ] Course hours distribution (equal/custom) matches class_offering values (within tolerance)

## Teacher Workload
- [ ] No teacher is assigned more periods than their `max_periods_per_week`
- [ ] All teaching assignments are unique (no duplicate teacher/class_offering pairs)

## OR-Tools Data Preparation
- [ ] Available slots for a term (for OR-Tools) are generated from `time_slots`, excluding holidays and breaks
- [ ] Requirements for each class are pulled directly from `class_offerings` (periods or hours)
- [ ] All validation functions and triggers are passing with no errors or warnings

---

**If all checklist items pass, the system is guaranteed to provide clean, unambiguous, and reliable data for OR-Tools timetable generation.** 