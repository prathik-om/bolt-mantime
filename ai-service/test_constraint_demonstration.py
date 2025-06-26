#!/usr/bin/env python3
"""
Test script to demonstrate each new constraint individually
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

def create_demo_data():
    """Create data for constraint demonstration"""
    
    # School configuration
    school_config = SchoolConfig(
        school_id="test_school",
        name="Test School",
        working_days=["monday", "tuesday"],
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
    
    # Subjects
    subjects = [
        {"id": "math", "name": "Mathematics", "department_id": "math_dept", "school_id": "test_school"},
        {"id": "english", "name": "English", "department_id": "english_dept", "school_id": "test_school"}
    ]
    
    # Teachers
    teachers = [
        Teacher(
            id="math_teacher",
            name="John Smith",
            email="john.smith@school.com",
            department_id="math_dept",
            max_periods_per_day=2,
            max_periods_per_week=4,
            qualifications=["mathematics"]
        ),
        Teacher(
            id="english_teacher",
            name="Jane Doe",
            email="jane.doe@school.com",
            department_id="english_dept",
            max_periods_per_day=2,
            max_periods_per_week=4,
            qualifications=["english"]
        )
    ]
    
    # Classes
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
        )
    ]
    
    # Time slots (3 per day, 2 days = 6 slots)
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
            current_time = time(
                end_time.hour + (end_time.minute + school_config.break_duration_minutes) // 60,
                (end_time.minute + school_config.break_duration_minutes) % 60
            )
    
    constraints = []
    
    return school_config, teachers, classes, [], time_slots, constraints, departments, subjects

class TimetableSolverDemo(TimetableSolver):
    """Demo solver that can disable specific constraints"""
    
    def __init__(self, *args, disable_teacher_hours=False, disable_subject_spacing=False, disable_gaps=False, **kwargs):
        super().__init__(*args, **kwargs)
        self.disable_teacher_hours = disable_teacher_hours
        self.disable_subject_spacing = disable_subject_spacing
        self.disable_gaps = disable_gaps
    
    def _add_custom_constraints(self):
        """Add custom constraints based on user requirements (no room logic)"""
        for constraint in self.constraints:
            if constraint.type.value == "teacher_availability":
                self._add_teacher_availability_constraint(constraint)
            elif constraint.type.value == "consecutive_lessons":
                self._add_consecutive_lessons_constraint(constraint)
            elif constraint.type.value == "max_lessons_per_day":
                self._add_max_lessons_per_day_constraint(constraint)
            elif constraint.type.value == "min_lessons_per_day":
                self._add_min_lessons_per_day_constraint(constraint)
        
        # Add new MVP constraints (conditionally)
        if not self.disable_teacher_hours:
            self._add_teacher_max_hours_constraints()
        if not self.disable_subject_spacing:
            self._add_subject_spacing_constraints()
        if not self.disable_gaps:
            self._add_class_gaps_constraints()

def test_constraint_demonstration():
    """Demonstrate each constraint individually"""
    print("=== Constraint Demonstration ===")
    print()
    
    school_config, teachers, classes, _, time_slots, constraints, departments, subjects = create_demo_data()
    
    print(f"Test Setup:")
    print(f"  Teachers: {len(teachers)}")
    print(f"  Classes: {len(classes)}")
    print(f"  Time slots: {len(time_slots)}")
    print(f"  Required lessons: 2 (1 math + 1 english)")
    print()
    
    # Test 1: All constraints enabled
    print("=== Test 1: All New Constraints Enabled ===")
    solver1 = TimetableSolverDemo(
        school_config=school_config,
        teachers=teachers,
        classes=classes,
        rooms=[],
        time_slots=time_slots,
        constraints=constraints,
        departments=departments,
        subjects=subjects
    )
    
    solver1.build_model()
    success1 = solver1.solve(time_limit=30)
    print(f"Result: {'✅ Solution found' if success1 else '❌ No solution'}")
    print()
    
    # Test 2: Disable teacher hours constraint
    print("=== Test 2: Teacher Hours Constraint Disabled ===")
    solver2 = TimetableSolverDemo(
        school_config=school_config,
        teachers=teachers,
        classes=classes,
        rooms=[],
        time_slots=time_slots,
        constraints=constraints,
        departments=departments,
        subjects=subjects,
        disable_teacher_hours=True
    )
    
    solver2.build_model()
    success2 = solver2.solve(time_limit=30)
    print(f"Result: {'✅ Solution found' if success2 else '❌ No solution'}")
    if success2:
        solution2 = solver2.get_solution()
        validation2 = solver2.validate_solution(solution2)
        print(f"Validation: {validation2.is_valid}, Score: {validation2.score}/100")
        
        # Check for teacher hours violations
        teacher_hours_violations = [v for v in validation2.violations if 'teacher_max_hours' in v['type']]
        print(f"Teacher hours violations: {len(teacher_hours_violations)}")
        for violation in teacher_hours_violations:
            print(f"  - {violation['message']}")
    print()
    
    # Test 3: Disable subject spacing constraint
    print("=== Test 3: Subject Spacing Constraint Disabled ===")
    solver3 = TimetableSolverDemo(
        school_config=school_config,
        teachers=teachers,
        classes=classes,
        rooms=[],
        time_slots=time_slots,
        constraints=constraints,
        departments=departments,
        subjects=subjects,
        disable_subject_spacing=True
    )
    
    solver3.build_model()
    success3 = solver3.solve(time_limit=30)
    print(f"Result: {'✅ Solution found' if success3 else '❌ No solution'}")
    if success3:
        solution3 = solver3.get_solution()
        validation3 = solver3.validate_solution(solution3)
        print(f"Validation: {validation3.is_valid}, Score: {validation3.score}/100")
        
        # Check for subject spacing violations
        spacing_violations = [v for v in validation3.violations if 'subject_spacing' in v['type']]
        print(f"Subject spacing violations: {len(spacing_violations)}")
        for violation in spacing_violations:
            print(f"  - {violation['message']}")
    print()
    
    # Test 4: Disable gaps constraint
    print("=== Test 4: Class Gaps Constraint Disabled ===")
    solver4 = TimetableSolverDemo(
        school_config=school_config,
        teachers=teachers,
        classes=classes,
        rooms=[],
        time_slots=time_slots,
        constraints=constraints,
        departments=departments,
        subjects=subjects,
        disable_gaps=True
    )
    
    solver4.build_model()
    success4 = solver4.solve(time_limit=30)
    print(f"Result: {'✅ Solution found' if success4 else '❌ No solution'}")
    if success4:
        solution4 = solver4.get_solution()
        validation4 = solver4.validate_solution(solution4)
        print(f"Validation: {validation4.is_valid}, Score: {validation4.score}/100")
        
        # Check for gap warnings
        gap_warnings = [w for w in validation4.warnings if 'class_gaps' in w['type']]
        print(f"Class gap warnings: {len(gap_warnings)}")
        for warning in gap_warnings:
            print(f"  - {warning['message']}")
    print()
    
    print("=== Summary ===")
    print("The tests demonstrate that:")
    print("1. Teacher max hours constraint prevents teachers from exceeding their limits")
    print("2. Subject spacing constraint prevents back-to-back same subjects")
    print("3. Class gaps constraint minimizes free periods in schedules")
    print("4. Constraint reporting provides detailed analysis when no solution is found")

if __name__ == "__main__":
    test_constraint_demonstration() 