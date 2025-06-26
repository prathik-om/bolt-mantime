#!/usr/bin/env python3
"""
Test script to demonstrate the new MVP constraints:
1. Teacher max hours
2. Subject spacing
3. Class gaps
4. Constraint reporting
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

def create_simple_test_data():
    """Create very simple test data to demonstrate new constraints"""
    
    # School configuration
    school_config = SchoolConfig(
        school_id="test_school",
        name="Test School",
        working_days=["monday", "tuesday", "wednesday"],
        start_time=time(8, 0),
        end_time=time(12, 0),  # 4 hours per day
        lesson_duration_minutes=60,
        break_duration_minutes=15
    )
    
    # Departments
    departments = [
        {"id": "math_dept", "name": "Mathematics Department", "school_id": "test_school"},
        {"id": "english_dept", "name": "English Department", "school_id": "test_school"}
    ]
    
    # Subjects with department mapping
    subjects = [
        {"id": "math", "name": "Mathematics", "department_id": "math_dept", "school_id": "test_school"},
        {"id": "english", "name": "English", "department_id": "english_dept", "school_id": "test_school"}
    ]
    
    # Teachers (2 teachers with department assignments and qualifications)
    teachers = [
        Teacher(
            id="math_teacher",
            name="John Smith",
            email="john.smith@school.com",
            department_id="math_dept",
            max_periods_per_day=3,
            max_periods_per_week=9,
            qualifications=["mathematics"]
        ),
        Teacher(
            id="english_teacher",
            name="Jane Doe",
            email="jane.doe@school.com",
            department_id="english_dept",
            max_periods_per_day=3,
            max_periods_per_week=9,
            qualifications=["english"]
        )
    ]
    
    # Classes (2 classes with minimal requirements)
    classes = [
        Class(
            id="class_1",
            name="Grade 10A",
            grade_level="10",
            department_id="general",
            student_count=20,
            subjects=[
                {"subject_id": "math", "hours_per_week": 1},
                {"subject_id": "english", "hours_per_week": 1}
            ]
        ),
        Class(
            id="class_2",
            name="Grade 10B",
            grade_level="10",
            department_id="general",
            student_count=18,
            subjects=[
                {"subject_id": "math", "hours_per_week": 1},
                {"subject_id": "english", "hours_per_week": 1}
            ]
        )
    ]
    
    # Time slots (3 per day, 3 days = 9 slots)
    time_slots = []
    slot_id = 1
    for day in school_config.working_days:
        current_time = school_config.start_time
        for _ in range(3):
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

def test_new_constraints():
    """Test the new MVP constraints"""
    print("=== Testing New MVP Constraints ===")
    print()
    
    school_config, teachers, classes, _, time_slots, constraints, departments, subjects = create_simple_test_data()
    
    print(f"School: {school_config.name}")
    print(f"Teachers: {len(teachers)}")
    print(f"Classes: {len(classes)}")
    print(f"Time slots: {len(time_slots)}")
    print(f"Departments: {len(departments)}")
    print(f"Subjects: {len(subjects)}")
    print()
    
    # Show teacher max hours
    print("Teacher Max Hours:")
    for teacher in teachers:
        print(f"  {teacher.name}: {teacher.max_periods_per_day} hours/day, {teacher.max_periods_per_week} hours/week")
    print()
    
    # Create solver with new constraints
    print("Creating solver with new MVP constraints...")
    solver = TimetableSolver(
        school_config=school_config,
        teachers=teachers,
        classes=classes,
        rooms=[],
        time_slots=time_slots,
        constraints=constraints,
        departments=departments,
        subjects=subjects
    )
    
    # Build model
    print("Building constraint model...")
    solver.build_model()
    
    print(f"Variables: {solver.variables_count}")
    print(f"Constraints: {solver.constraints_count}")
    print()
    
    # Solve
    print("Solving timetable problem...")
    success = solver.solve(time_limit=60)
    
    if success:
        print("✅ Solution found!")
        
        # Get solution
        solution = solver.get_solution()
        print(f"Generated {len(solution)} timetable entries")
        
        # Validate solution
        validation = solver.validate_solution(solution)
        print(f"Solution valid: {validation.is_valid}")
        print(f"Solution score: {validation.score}/100")
        
        if validation.violations:
            print(f"Violations: {len(validation.violations)}")
            for violation in validation.violations:
                print(f"  - {violation['message']}")
        
        if validation.warnings:
            print(f"Warnings: {len(validation.warnings)}")
            for warning in validation.warnings:
                print(f"  - {warning['message']}")
        
        # Show timetable
        print("\nGenerated Timetable:")
        for entry in solution:
            teacher = next((t for t in teachers if t.id == entry.teacher_id), None)
            teacher_dept = next((d['name'] for d in departments if d['id'] == teacher.department_id), "Unknown") if teacher else "Unknown"
            subject_name = next((s['name'] for s in subjects if s['id'] == entry.subject_id), entry.subject_id)
            print(f"  {entry.day} {entry.start_time}-{entry.end_time}: "
                  f"Class {entry.class_id} with {teacher.name if teacher else entry.teacher_id} "
                  f"({teacher_dept}) teaching {subject_name}")
        
        # Get statistics
        stats = solver.get_statistics()
        print(f"\nSolver statistics:")
        print(f"  Solve time: {stats.solve_time_seconds:.2f} seconds")
        print(f"  Solution quality: {stats.solution_quality}")
        if stats.objective_value is not None:
            print(f"  Objective value: {stats.objective_value}")
        
    else:
        print("❌ No feasible solution found")
        print("The constraint analysis should have been shown above.")

if __name__ == "__main__":
    test_new_constraints() 