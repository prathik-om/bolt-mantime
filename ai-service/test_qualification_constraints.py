#!/usr/bin/env python3
"""
Test script to demonstrate qualification constraints working
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import time
from models import (
    SchoolConfig, Teacher, Class, TimeSlot, Constraint,
    ConstraintType
)
from timetable_solver import TimetableSolver

def create_qualification_test_data():
    """Create test data to demonstrate qualification constraints"""
    
    # School configuration
    school_config = SchoolConfig(
        school_id="test_school",
        name="Test School",
        working_days=["monday", "tuesday", "wednesday", "thursday", "friday"],
        start_time=time(8, 0),
        end_time=time(14, 0),  # 6 hours per day
        lesson_duration_minutes=60,
        break_duration_minutes=15
    )
    
    # Departments
    departments = [
        {"id": "math_dept", "name": "Mathematics Department", "school_id": "test_school"},
        {"id": "english_dept", "name": "English Department", "school_id": "test_school"},
        {"id": "science_dept", "name": "Science Department", "school_id": "test_school"}
    ]
    
    # Subjects with department mapping
    subjects = [
        {"id": "math", "name": "Mathematics", "department_id": "math_dept", "school_id": "test_school"},
        {"id": "english", "name": "English", "department_id": "english_dept", "school_id": "test_school"},
        {"id": "physics", "name": "Physics", "department_id": "science_dept", "school_id": "test_school"}
    ]
    
    # Teachers (3 teachers with department assignments and qualifications)
    teachers = [
        Teacher(
            id="math_teacher",
            name="John Smith",
            email="john.smith@school.com",
            department_id="math_dept",
            max_periods_per_day=4,
            max_periods_per_week=20,
            qualifications=["mathematics"]
        ),
        Teacher(
            id="english_teacher",
            name="Jane Doe",
            email="jane.doe@school.com",
            department_id="english_dept",
            max_periods_per_day=4,
            max_periods_per_week=20,
            qualifications=["english"]
        ),
        Teacher(
            id="science_teacher",
            name="Dr. Emily Brown",
            email="emily.brown@school.com",
            department_id="science_dept",
            max_periods_per_day=4,
            max_periods_per_week=20,
            qualifications=["physics"]
        )
    ]
    
    # Classes (2 classes with balanced subject requirements)
    classes = [
        Class(
            id="class_10a",
            name="Grade 10A",
            grade_level="10",
            department_id="general",
            student_count=25,
            subjects=[
                {"subject_id": "math", "hours_per_week": 2},
                {"subject_id": "english", "hours_per_week": 2},
                {"subject_id": "physics", "hours_per_week": 1}
            ]
        ),
        Class(
            id="class_10b",
            name="Grade 10B",
            grade_level="10",
            department_id="general",
            student_count=22,
            subjects=[
                {"subject_id": "math", "hours_per_week": 2},
                {"subject_id": "english", "hours_per_week": 2},
                {"subject_id": "physics", "hours_per_week": 1}
            ]
        )
    ]
    
    # Time slots (5 per day, 5 days = 25 slots)
    time_slots = []
    slot_id = 1
    for day in school_config.working_days:
        current_time = school_config.start_time
        for _ in range(5):
            end_time = time(
                current_time.hour + (current_time.minute + school_config.lesson_duration_minutes) // 60,
                (current_time.minute + school_config.lesson_duration_minutes) % 60
            )
            time_slots.append(TimeSlot(
                id=f"slot_{slot_id}",
                day=day,
                start_time=current_time,
                end_time=end_time,
                slot_type="regular"
            ))
            slot_id += 1
            # Add break time
            current_time = time(
                end_time.hour + (end_time.minute + school_config.break_duration_minutes) // 60,
                (end_time.minute + school_config.break_duration_minutes) % 60
            )
    
    # No additional constraints
    constraints = []
    
    return school_config, teachers, classes, [], time_slots, constraints, departments, subjects

def test_qualification_constraints():
    """Test qualification constraints specifically"""
    print("=== Testing Qualification Constraints ===")
    print()
    
    school_config, teachers, classes, _, time_slots, constraints, departments, subjects = create_qualification_test_data()
    
    print(f"School: {school_config.name}")
    print(f"Teachers: {len(teachers)}")
    print(f"Classes: {len(classes)}")
    print(f"Time slots: {len(time_slots)}")
    print(f"Departments: {len(departments)}")
    print(f"Subjects: {len(subjects)}")
    print()
    
    # Show department-subject mapping
    print("Department-Subject Mapping:")
    for dept in departments:
        dept_subjects = [s['name'] for s in subjects if s['department_id'] == dept['id']]
        print(f"  {dept['name']}: {', '.join(dept_subjects)}")
    print()
    
    # Show teacher qualifications
    print("Teacher Qualifications:")
    for teacher in teachers:
        dept_name = next((d['name'] for d in departments if d['id'] == teacher.department_id), "Unknown")
        print(f"  {teacher.name} ({dept_name}): {', '.join(teacher.qualifications)}")
    print()
    
    # Test WITHOUT qualification constraints
    print("=== Test 1: WITHOUT Qualification Constraints ===")
    solver_no_qual = TimetableSolver(
        school_config=school_config,
        teachers=teachers,
        classes=classes,
        rooms=[],
        time_slots=time_slots,
        constraints=constraints,
        departments=None,  # No department data
        subjects=None      # No subject data
    )
    
    solver_no_qual.build_model()
    success_no_qual = solver_no_qual.solve(time_limit=30)
    
    if success_no_qual:
        solution_no_qual = solver_no_qual.get_solution()
        validation_no_qual = solver_no_qual.validate_solution(solution_no_qual)
        print(f"✅ Solution found: {len(solution_no_qual)} entries")
        print(f"Valid: {validation_no_qual.is_valid}, Score: {validation_no_qual.score}/100")
        
        # Check for qualification violations
        qual_violations = [v for v in validation_no_qual.violations if v['type'] == 'qualification_violation']
        print(f"Qualification violations: {len(qual_violations)}")
        for violation in qual_violations:
            print(f"  - {violation['message']}")
    else:
        print("❌ No solution found")
    print()
    
    # Test WITH qualification constraints
    print("=== Test 2: WITH Qualification Constraints ===")
    solver_with_qual = TimetableSolver(
        school_config=school_config,
        teachers=teachers,
        classes=classes,
        rooms=[],
        time_slots=time_slots,
        constraints=constraints,
        departments=departments,  # With department data
        subjects=subjects         # With subject data
    )
    
    solver_with_qual.build_model()
    success_with_qual = solver_with_qual.solve(time_limit=30)
    
    if success_with_qual:
        solution_with_qual = solver_with_qual.get_solution()
        validation_with_qual = solver_with_qual.validate_solution(solution_with_qual)
        print(f"✅ Solution found: {len(solution_with_qual)} entries")
        print(f"Valid: {validation_with_qual.is_valid}, Score: {validation_with_qual.score}/100")
        
        # Check for qualification violations
        qual_violations = [v for v in validation_with_qual.violations if v['type'] == 'qualification_violation']
        print(f"Qualification violations: {len(qual_violations)}")
        for violation in qual_violations:
            print(f"  - {violation['message']}")
        
        # Show the solution
        print("\nGenerated Timetable:")
        for entry in solution_with_qual:
            teacher = next((t for t in teachers if t.id == entry.teacher_id), None)
            teacher_dept = next((d['name'] for d in departments if d['id'] == teacher.department_id), "Unknown") if teacher else "Unknown"
            subject_name = next((s['name'] for s in subjects if s['id'] == entry.subject_id), entry.subject_id)
            print(f"  {entry.day} {entry.start_time}-{entry.end_time}: "
                  f"Class {entry.class_id} with {teacher.name if teacher else entry.teacher_id} "
                  f"({teacher_dept}) teaching {subject_name}")
    else:
        print("❌ No solution found")
    print()

if __name__ == "__main__":
    test_qualification_constraints() 