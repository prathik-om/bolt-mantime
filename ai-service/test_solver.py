#!/usr/bin/env python3
"""
Test script for the TimetableSolver (MVP: no room logic, with qualification constraints)
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

def create_sample_data():
    """Create sample data for testing (MVP: no room logic, with qualification constraints)"""
    
    # School configuration
    school_config = SchoolConfig(
        school_id="test_school",
        name="Test School",
        working_days=["monday", "tuesday", "wednesday", "thursday", "friday"],
        start_time=time(8, 0),
        end_time=time(15, 0),  # Longer day for more slots
        lesson_duration_minutes=45,
        break_duration_minutes=10
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
    
    # Teachers (2 teachers with department assignments)
    teachers = [
        Teacher(
            id="teacher_1",
            name="John Smith",
            email="john.smith@school.com",
            department_id="math_dept",  # Math department
            max_hours_per_day=7,
            max_hours_per_week=35,
            qualifications=["mathematics"]
        ),
        Teacher(
            id="teacher_2",
            name="Jane Doe",
            email="jane.doe@school.com",
            department_id="english_dept",  # English department
            max_hours_per_day=7,
            max_hours_per_week=35,
            qualifications=["english"]
        )
    ]
    
    # Classes (2 classes)
    classes = [
        Class(
            id="class_1",
            name="Grade 10A",
            grade_level="10",
            department_id="general",
            student_count=20,
            subjects=[
                {"subject_id": "math", "hours_per_week": 2},
                {"subject_id": "english", "hours_per_week": 2}
            ]
        ),
        Class(
            id="class_2",
            name="Grade 10B",
            grade_level="10",
            department_id="general",
            student_count=18,
            subjects=[
                {"subject_id": "math", "hours_per_week": 2},
                {"subject_id": "english", "hours_per_week": 2}
            ]
        )
    ]
    
    # Time slots (6 per day, 5 days = 30 slots)
    time_slots = []
    slot_id = 1
    for day in school_config.working_days:
        current_time = school_config.start_time
        for _ in range(6):
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
    
    # Constraints (only max lessons per day)
    constraints = [
        Constraint(
            type=ConstraintType.MAX_LESSONS_PER_DAY,
            description="Maximum 6 lessons per day per class",
            parameters={"max_lessons": 6},
            weight=1.0,
            is_hard=True
        )
    ]
    
    return school_config, teachers, classes, [], time_slots, constraints, departments, subjects

def test_solver():
    """Test the timetable solver with qualification constraints"""
    print("Creating sample data...")
    school_config, teachers, classes, _, time_slots, constraints, departments, subjects = create_sample_data()
    
    print(f"School: {school_config.name}")
    print(f"Teachers: {len(teachers)}")
    print(f"Classes: {len(classes)}")
    print(f"Time slots: {len(time_slots)}")
    print(f"Constraints: {len(constraints)}")
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
    
    # Create solver
    print("Creating solver...")
    solver = TimetableSolver(
        school_config=school_config,
        teachers=teachers,
        classes=classes,
        rooms=[],  # No rooms for MVP
        time_slots=time_slots,
        constraints=constraints,
        departments=departments,  # Add department data
        subjects=subjects         # Add subject data
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
            for violation in validation.violations[:3]:  # Show first 3
                print(f"  - {violation['message']}")
        
        # Show sample entries with qualification info
        print("\nSample timetable entries:")
        for entry in solution[:5]:  # Show first 5
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
        print("Try relaxing constraints or adding more resources")

if __name__ == "__main__":
    test_solver() 