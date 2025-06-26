from ortools.sat.python import cp_model
import time as time_module
from typing import List, Dict, Optional, Any, Tuple
from datetime import time, timedelta
import math

from models import (
    SchoolConfig, Teacher, Class, TimeSlot, Constraint,
    TimetableEntry, ValidationResult, SolverStatistics
)

class TimetableSolver:
    def __init__(
        self,
        school_config: SchoolConfig,
        teachers: List[Teacher],
        classes: List[Class],
        rooms: List[Any],  # Ignored for MVP
        time_slots: List[TimeSlot],
        constraints: List[Constraint],
        departments: Optional[List[Dict]] = None,  # Add departments for qualification matching
        subjects: Optional[List[Dict]] = None      # Add subjects for qualification matching
    ):
        self.school_config = school_config
        self.teachers = {t.id: t for t in teachers}
        self.classes = {c.id: c for c in classes}
        self.time_slots = {ts.id: ts for ts in time_slots}
        self.constraints = constraints
        self.departments = {d['id']: d for d in departments} if departments else {}
        self.subjects = {s['id']: s for s in subjects} if subjects else {}
        
        # OR-Tools model
        self.model = None
        self.solver = None
        
        # Decision variables
        self.assignments = {}  # (class_id, teacher_id, time_slot_id) -> BoolVar
        self.teacher_assignments = {}  # (teacher_id, time_slot_id) -> BoolVar
        self.class_assignments = {}  # (class_id, time_slot_id) -> BoolVar
        
        # Statistics
        self.start_time = None
        self.end_time = None
        self.variables_count = 0
        self.constraints_count = 0
        
        # Solution
        self.solution = None
        
    def build_model(self):
        """Build the constraint programming model (no room logic)"""
        self.start_time = time_module.time()
        
        # Create model
        self.model = cp_model.CpModel()
        
        # Create decision variables
        self._create_variables()
        
        # Add constraints
        self._add_basic_constraints()
        self._add_qualification_constraints()  # Add qualification constraints
        self._add_custom_constraints()
        
        # Add objective function
        self._add_objective()
        
        # Update final constraint count after all constraints are added
        self.constraints_count = len(self.model.Proto().constraints)
        
        self.end_time = time_module.time()
        
    def _create_variables(self):
        """Create decision variables (no room logic)"""
        # Main assignment variables
        for class_id in self.classes:
            for teacher_id in self.teachers:
                for time_slot_id in self.time_slots:
                    var_name = f"assign_{class_id}_{teacher_id}_{time_slot_id}"
                    self.assignments[(class_id, teacher_id, time_slot_id)] = \
                        self.model.NewBoolVar(var_name)
        
        # Teacher assignment variables
        for teacher_id in self.teachers:
            for time_slot_id in self.time_slots:
                var_name = f"teacher_{teacher_id}_{time_slot_id}"
                self.teacher_assignments[(teacher_id, time_slot_id)] = \
                    self.model.NewBoolVar(var_name)
        
        # Class assignment variables
        for class_id in self.classes:
            for time_slot_id in self.time_slots:
                var_name = f"class_{class_id}_{time_slot_id}"
                self.class_assignments[(class_id, time_slot_id)] = \
                    self.model.NewBoolVar(var_name)
        
        self.variables_count = len(self.assignments) + len(self.teacher_assignments) + \
                              len(self.class_assignments)
    
    def _add_basic_constraints(self):
        """Add basic timetable constraints (no room logic)"""
        
        # 1. Each class must be assigned exactly once per required subject hours
        for class_id, class_info in self.classes.items():
            for subject in class_info.subjects:
                subject_id = subject.get('subject_id')
                hours_per_week = subject.get('hours_per_week', 1)
                
                # Count assignments for this class-subject combination
                subject_assignments = []
                for teacher_id in self.teachers:
                    for time_slot_id in self.time_slots:
                        subject_assignments.append(
                            self.assignments[(class_id, teacher_id, time_slot_id)]
                        )
                
                # Must have exactly hours_per_week assignments
                self.model.Add(sum(subject_assignments) == hours_per_week)
        
        # 2. Each teacher can only teach one class at a time
        for teacher_id in self.teachers:
            for time_slot_id in self.time_slots:
                teacher_slots = []
                for class_id in self.classes:
                    teacher_slots.append(
                        self.assignments[(class_id, teacher_id, time_slot_id)]
                    )
                
                # Teacher can teach at most one class per time slot
                self.model.Add(sum(teacher_slots) <= 1)
                
                # Link teacher assignments to main assignments
                self.model.Add(self.teacher_assignments[(teacher_id, time_slot_id)] == 
                              sum(teacher_slots))
        
        # 3. Each class can only have one teacher at a time
        for class_id in self.classes:
            for time_slot_id in self.time_slots:
                class_slots = []
                for teacher_id in self.teachers:
                    class_slots.append(
                        self.assignments[(class_id, teacher_id, time_slot_id)]
                    )
                
                # Class can be assigned at most one teacher per time slot
                self.model.Add(sum(class_slots) <= 1)
                
                # Link class assignments to main assignments
                self.model.Add(self.class_assignments[(class_id, time_slot_id)] == 
                              sum(class_slots))
    
    def _add_qualification_constraints(self):
        """Add teacher qualification constraints based on department-subject mapping"""
        if not self.departments or not self.subjects:
            return  # Skip if no department/subject data
        
        # Create teacher-subject qualification mapping
        teacher_qualifications = {}
        for teacher_id, teacher in self.teachers.items():
            teacher_dept_id = teacher.department_id
            if teacher_dept_id and teacher_dept_id in self.departments:
                # Get subjects from teacher's department
                dept_subjects = [
                    subject_id for subject_id, subject in self.subjects.items()
                    if subject.get('department_id') == teacher_dept_id
                ]
                teacher_qualifications[teacher_id] = dept_subjects
        
        # Add constraints: teachers can only teach subjects from their department
        for class_id, class_info in self.classes.items():
            for subject in class_info.subjects:
                subject_id = subject.get('subject_id')
                
                # Find teachers qualified for this subject
                qualified_teachers = []
                for teacher_id, teacher in self.teachers.items():
                    if teacher_id in teacher_qualifications:
                        if subject_id in teacher_qualifications[teacher_id]:
                            qualified_teachers.append(teacher_id)
                    else:
                        # If no department mapping, allow all teachers (fallback)
                        qualified_teachers.append(teacher_id)
                
                # Only qualified teachers can teach this subject
                for teacher_id in self.teachers:
                    if teacher_id not in qualified_teachers:
                        # This teacher is not qualified for this subject
                        for time_slot_id in self.time_slots:
                            self.model.Add(
                                self.assignments[(class_id, teacher_id, time_slot_id)] == 0
                            )
    
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
        
        # Add new MVP constraints
        self._add_teacher_max_hours_constraints()
        self._add_subject_spacing_constraints()
        self._add_class_gaps_constraints()
    
    def _add_teacher_max_hours_constraints(self):
        """Add constraints to enforce teacher maximum periods per day and week"""
        for teacher_id, teacher in self.teachers.items():
            # Daily periods constraint
            for day in self.school_config.working_days:
                day_assignments = []
                for time_slot_id, time_slot in self.time_slots.items():
                    if time_slot.day == day:
                        day_assignments.append(
                            self.teacher_assignments[(teacher_id, time_slot_id)]
                        )
                
                if day_assignments:
                    self.model.Add(sum(day_assignments) <= teacher.max_periods_per_day)
            
            # Weekly periods constraint
            weekly_assignments = []
            for time_slot_id in self.time_slots:
                weekly_assignments.append(
                    self.teacher_assignments[(teacher_id, time_slot_id)]
                )
            
            if weekly_assignments:
                self.model.Add(sum(weekly_assignments) <= teacher.max_periods_per_week)
    
    def _add_subject_spacing_constraints(self):
        """Add constraints to avoid same subject being scheduled back-to-back for a class"""
        for class_id, class_info in self.classes.items():
            for day in self.school_config.working_days:
                # Get time slots for this day, sorted by start time
                day_slots = [
                    (ts_id, ts) for ts_id, ts in self.time_slots.items() 
                    if ts.day == day
                ]
                day_slots.sort(key=lambda x: x[1].start_time)
                
                # Check consecutive pairs of time slots
                for i in range(len(day_slots) - 1):
                    slot1_id, slot1 = day_slots[i]
                    slot2_id, slot2 = day_slots[i + 1]
                    
                    # For each subject, ensure it's not scheduled in consecutive slots
                    for subject in class_info.subjects:
                        subject_id = subject.get('subject_id')
                        
                        # Get assignments for this subject in consecutive slots
                        slot1_subject_assignments = []
                        slot2_subject_assignments = []
                        
                        for teacher_id in self.teachers:
                            # Check if teacher is qualified for this subject
                            if self._is_teacher_qualified_for_subject(self.teachers[teacher_id], subject_id):
                                slot1_subject_assignments.append(
                                    self.assignments[(class_id, teacher_id, slot1_id)]
                                )
                                slot2_subject_assignments.append(
                                    self.assignments[(class_id, teacher_id, slot2_id)]
                                )
                        
                        # Ensure subject is not scheduled in both consecutive slots
                        if slot1_subject_assignments and slot2_subject_assignments:
                            self.model.Add(
                                sum(slot1_subject_assignments) + sum(slot2_subject_assignments) <= 1
                            )
    
    def _add_class_gaps_constraints(self):
        """Add constraints to minimize gaps in class schedules"""
        for class_id, class_info in self.classes.items():
            for day in self.school_config.working_days:
                # Get time slots for this day, sorted by start time
                day_slots = [
                    (ts_id, ts) for ts_id, ts in self.time_slots.items() 
                    if ts.day == day
                ]
                day_slots.sort(key=lambda x: x[1].start_time)
                
                # Create gap variables for each potential gap
                gap_variables = []
                for i in range(len(day_slots) - 1):
                    slot1_id, slot1 = day_slots[i]
                    slot2_id, slot2 = day_slots[i + 1]
                    
                    # Create a gap variable: 1 if there's a gap between these slots
                    gap_var = self.model.NewBoolVar(f"gap_{class_id}_{day}_{i}")
                    gap_variables.append(gap_var)
                    
                    # Gap exists if slot1 has a lesson but slot2 doesn't
                    slot1_has_lesson = sum([
                        self.assignments[(class_id, teacher_id, slot1_id)]
                        for teacher_id in self.teachers
                    ])
                    slot2_has_lesson = sum([
                        self.assignments[(class_id, teacher_id, slot2_id)]
                        for teacher_id in self.teachers
                    ])
                    
                    # Gap = slot1_has_lesson AND NOT slot2_has_lesson
                    self.model.Add(gap_var <= slot1_has_lesson)
                    self.model.Add(gap_var <= 1 - slot2_has_lesson)
                    self.model.Add(slot1_has_lesson + (1 - slot2_has_lesson) - 1 <= gap_var)
                
                # Minimize total gaps (add to objective function)
                if gap_variables:
                    # Store gap variables for objective function
                    if not hasattr(self, 'gap_variables'):
                        self.gap_variables = []
                    self.gap_variables.extend(gap_variables)
    
    def _add_objective(self):
        """Add objective function for optimization (no room logic)"""
        # Simple objective: minimize teacher conflicts (soft constraint)
        objective_terms = []
        for teacher_id in self.teachers:
            for time_slot_id in self.time_slots:
                teacher_slots = []
                for class_id in self.classes:
                    teacher_slots.append(
                        self.assignments[(class_id, teacher_id, time_slot_id)]
                    )
                if len(teacher_slots) > 1:
                    objective_terms.append(sum(teacher_slots))
        
        # Add gap minimization to objective
        if hasattr(self, 'gap_variables') and self.gap_variables:
            # Weight gaps more heavily than conflicts
            gap_weight = 10
            for gap_var in self.gap_variables:
                objective_terms.append(gap_weight * gap_var)
        
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
    
    def get_constraint_analysis(self) -> Dict[str, Any]:
        """Analyze which constraints might be most restrictive"""
        if not self.solver:
            return {"error": "No solver available"}
        
        analysis = {
            "total_constraints": len(self.model.Proto().constraints),
            "total_variables": len(self.model.Proto().variables),
            "solver_status": self.solver.StatusName(),
            "constraint_breakdown": {},
            "potential_bottlenecks": []
        }
        
        # Analyze teacher workload
        total_teacher_periods_needed = 0
        total_teacher_periods_available = 0
        
        for class_id, class_info in self.classes.items():
            for subject in class_info.subjects:
                hours_per_week = subject.get('hours_per_week', 1)
                total_teacher_periods_needed += hours_per_week
        
        for teacher_id, teacher in self.teachers.items():
            total_teacher_periods_available += teacher.max_periods_per_week
        
        analysis["teacher_workload"] = {
            "periods_needed": total_teacher_periods_needed,
            "periods_available": total_teacher_periods_available,
            "ratio": total_teacher_periods_needed / total_teacher_periods_available if total_teacher_periods_available > 0 else float('inf')
        }
        
        # Analyze time slot availability
        total_time_slots = len(self.time_slots)
        total_lessons_needed = sum(
            sum(subject.get('hours_per_week', 1) for subject in class_info.subjects)
            for class_info in self.classes.values()
        )
        
        analysis["time_slot_analysis"] = {
            "total_slots": total_time_slots,
            "total_lessons_needed": total_lessons_needed,
            "utilization_ratio": total_lessons_needed / total_time_slots if total_time_slots > 0 else float('inf')
        }
        
        # Identify potential bottlenecks
        if analysis["teacher_workload"]["ratio"] > 1.0:
            analysis["potential_bottlenecks"].append(
                f"Teacher workload: Need {total_teacher_periods_needed} periods, have {total_teacher_periods_available} available"
            )
        
        if analysis["time_slot_analysis"]["utilization_ratio"] > 1.0:
            analysis["potential_bottlenecks"].append(
                f"Time slot utilization: Need {total_lessons_needed} lessons, have {total_time_slots} slots"
            )
        
        # Check qualification constraints
        qualified_teachers_per_subject = {}
        for class_id, class_info in self.classes.items():
            for subject in class_info.subjects:
                subject_id = subject.get('subject_id')
                if subject_id not in qualified_teachers_per_subject:
                    qualified_teachers_per_subject[subject_id] = 0
                
                for teacher_id, teacher in self.teachers.items():
                    if self._is_teacher_qualified_for_subject(teacher, subject_id):
                        qualified_teachers_per_subject[subject_id] += 1
        
        for subject_id, count in qualified_teachers_per_subject.items():
            if count == 0:
                analysis["potential_bottlenecks"].append(
                    f"No qualified teachers for subject: {subject_id}"
                )
            elif count == 1:
                analysis["potential_bottlenecks"].append(
                    f"Only one qualified teacher for subject: {subject_id}"
                )
        
        return analysis
    
    def _add_teacher_availability_constraint(self, constraint: Constraint):
        """Add teacher availability constraints (no room logic)"""
        teacher_id = constraint.parameters.get('teacher_id')
        if teacher_id and teacher_id in self.teachers:
            teacher = self.teachers[teacher_id]
            for day, available_slots in teacher.availability.items():
                for time_slot_id, time_slot in self.time_slots.items():
                    if time_slot.day == day and time_slot_id not in available_slots:
                        for class_id in self.classes:
                            self.model.Add(
                                self.assignments[(class_id, teacher_id, time_slot_id)] == 0
                            )
    
    def _add_consecutive_lessons_constraint(self, constraint: Constraint):
        """Add constraints for consecutive lessons (no room logic)"""
        max_consecutive = constraint.parameters.get('max_consecutive', 3)
        for class_id in self.classes:
            for day in self.school_config.working_days:
                day_slots = [ts_id for ts_id, ts in self.time_slots.items() if ts.day == day]
                day_slots.sort(key=lambda x: self.time_slots[x].start_time)
                for i in range(len(day_slots) - max_consecutive + 1):
                    consecutive_slots = day_slots[i:i + max_consecutive + 1]
                    consecutive_assignments = []
                    for slot_id in consecutive_slots:
                        for teacher_id in self.teachers:
                            consecutive_assignments.append(
                                self.assignments[(class_id, teacher_id, slot_id)]
                            )
                    self.model.Add(sum(consecutive_assignments) <= max_consecutive)
    
    def _add_max_lessons_per_day_constraint(self, constraint: Constraint):
        """Add maximum lessons per day constraint (no room logic)"""
        max_lessons = constraint.parameters.get('max_lessons', 6)
        for class_id in self.classes:
            for day in self.school_config.working_days:
                day_assignments = []
                for time_slot_id, time_slot in self.time_slots.items():
                    if time_slot.day == day:
                        for teacher_id in self.teachers:
                            day_assignments.append(
                                self.assignments[(class_id, teacher_id, time_slot_id)]
                            )
                self.model.Add(sum(day_assignments) <= max_lessons)
    
    def _add_min_lessons_per_day_constraint(self, constraint: Constraint):
        """Add minimum lessons per day constraint (no room logic)"""
        min_lessons = constraint.parameters.get('min_lessons', 1)
        for class_id in self.classes:
            for day in self.school_config.working_days:
                day_assignments = []
                for time_slot_id, time_slot in self.time_slots.items():
                    if time_slot.day == day:
                        for teacher_id in self.teachers:
                            day_assignments.append(
                                self.assignments[(class_id, teacher_id, time_slot_id)]
                            )
                self.model.Add(sum(day_assignments) >= min_lessons)
    
    def solve(self, time_limit: int = 30) -> bool:
        """Solve the timetable problem (no room logic)"""
        if not self.model:
            raise ValueError("Model not built. Call build_model() first.")
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = time_limit
        status = self.solver.Solve(self.model)
        
        # If no solution found, provide constraint analysis
        if status != cp_model.OPTIMAL and status != cp_model.FEASIBLE:
            print("❌ No feasible solution found")
            print("Analyzing constraints to identify bottlenecks...")
            analysis = self.get_constraint_analysis()
            
            print(f"\n📊 Constraint Analysis:")
            print(f"  Total constraints: {analysis['total_constraints']}")
            print(f"  Total variables: {analysis['total_variables']}")
            print(f"  Solver status: {analysis['solver_status']}")
            
            print(f"\n👨‍🏫 Teacher Workload Analysis:")
            workload = analysis['teacher_workload']
            print(f"  Periods needed: {workload['periods_needed']}")
            print(f"  Periods available: {workload['periods_available']}")
            print(f"  Utilization ratio: {workload['ratio']:.2f}")
            
            print(f"\n⏰ Time Slot Analysis:")
            time_analysis = analysis['time_slot_analysis']
            print(f"  Total slots: {time_analysis['total_slots']}")
            print(f"  Lessons needed: {time_analysis['total_lessons_needed']}")
            print(f"  Utilization ratio: {time_analysis['utilization_ratio']:.2f}")
            
            if analysis['potential_bottlenecks']:
                print(f"\n🚨 Potential Bottlenecks:")
                for bottleneck in analysis['potential_bottlenecks']:
                    print(f"  - {bottleneck}")
            
            print(f"\n💡 Suggestions:")
            if workload['ratio'] > 1.0:
                print(f"  - Increase teacher periods or add more teachers")
            if time_analysis['utilization_ratio'] > 1.0:
                print(f"  - Add more time slots or reduce subject hours")
            if not analysis['potential_bottlenecks']:
                print(f"  - Try relaxing some constraints or increasing time limit")
        
        return status == cp_model.OPTIMAL or status == cp_model.FEASIBLE
    
    def get_solution(self) -> List[TimetableEntry]:
        """Extract the solution from the solver (no room logic)"""
        if not self.solver:
            raise ValueError("No solution available. Call solve() first.")
        solution = []
        for (class_id, teacher_id, time_slot_id), var in self.assignments.items():
            if self.solver.Value(var) == 1:
                time_slot = self.time_slots[time_slot_id]
                subject_id = self._get_subject_for_assignment(class_id, teacher_id)
                entry = TimetableEntry(
                    class_id=class_id,
                    teacher_id=teacher_id,
                    room_id="none",  # No room for MVP
                    time_slot_id=time_slot_id,
                    subject_id=subject_id,
                    day=time_slot.day,
                    start_time=time_slot.start_time,
                    end_time=time_slot.end_time
                )
                solution.append(entry)
        return solution
    
    def _get_subject_for_assignment(self, class_id: str, teacher_id: str) -> str:
        """Get the subject for a class-teacher assignment with qualification checking"""
        class_info = self.classes[class_id]
        teacher_info = self.teachers[teacher_id]
        
        # Find which subject this teacher is qualified to teach for this class
        if class_info.subjects:
            for subject in class_info.subjects:
                subject_id = subject.get('subject_id')
                
                # Check if teacher is qualified for this subject
                if self._is_teacher_qualified_for_subject(teacher_info, subject_id):
                    return subject_id
        
        # Fallback to first subject if no qualification match found
        if class_info.subjects:
            return class_info.subjects[0].get('subject_id', 'unknown')
        return 'unknown'
    
    def _is_teacher_qualified_for_subject(self, teacher: Teacher, subject_id: str) -> bool:
        """Check if teacher is qualified to teach a specific subject"""
        if not self.departments or not self.subjects:
            return True  # Allow all if no department/subject data
        
        teacher_dept_id = teacher.department_id
        if not teacher_dept_id or teacher_dept_id not in self.departments:
            return True  # Allow if no department mapping
        
        # Check if subject belongs to teacher's department
        if subject_id in self.subjects:
            subject_dept_id = self.subjects[subject_id].get('department_id')
            return subject_dept_id == teacher_dept_id
        
        return True  # Allow if subject not found in mapping
    
    def validate_solution(self, solution: List[TimetableEntry]) -> ValidationResult:
        """Validate the generated solution (no room logic)"""
        violations = []
        warnings = []
        score = 100.0  # Start with perfect score
        time_slot_assignments = {}
        for entry in solution:
            key = (entry.day, entry.start_time, entry.end_time)
            if key not in time_slot_assignments:
                time_slot_assignments[key] = []
            time_slot_assignments[key].append(entry)
        
        # Check teacher conflicts
        for time_slot, entries in time_slot_assignments.items():
            teachers = [entry.teacher_id for entry in entries]
            if len(teachers) != len(set(teachers)):
                violations.append({
                    "type": "teacher_conflict",
                    "time_slot": time_slot,
                    "teachers": teachers,
                    "message": f"Teacher conflict at {time_slot}"
                })
                score -= 10
        
        # Check class conflicts
        for time_slot, entries in time_slot_assignments.items():
            classes = [entry.class_id for entry in entries]
            if len(classes) != len(set(classes)):
                violations.append({
                    "type": "class_conflict",
                    "time_slot": time_slot,
                    "classes": classes,
                    "message": f"Class conflict at {time_slot}"
                })
                score -= 10
        
        # Check teacher-subject qualifications
        for entry in solution:
            teacher = self.teachers.get(entry.teacher_id)
            if teacher and not self._is_teacher_qualified_for_subject(teacher, entry.subject_id):
                violations.append({
                    "type": "qualification_violation",
                    "teacher": entry.teacher_id,
                    "subject": entry.subject_id,
                    "message": f"Teacher {entry.teacher_id} is not qualified to teach {entry.subject_id}"
                })
                score -= 5
        
        # Check teacher max hours constraints
        teacher_hours = {}
        for entry in solution:
            teacher_id = entry.teacher_id
            day = entry.day
            
            if teacher_id not in teacher_hours:
                teacher_hours[teacher_id] = {"daily": {}, "weekly": 0}
            if day not in teacher_hours[teacher_id]["daily"]:
                teacher_hours[teacher_id]["daily"][day] = 0
            
            teacher_hours[teacher_id]["daily"][day] += 1
            teacher_hours[teacher_id]["weekly"] += 1
        
        for teacher_id, hours in teacher_hours.items():
            teacher = self.teachers.get(teacher_id)
            if teacher:
                # Check daily hours
                for day, daily_hours in hours["daily"].items():
                    if daily_hours > teacher.max_periods_per_day:
                        violations.append({
                            "type": "teacher_max_hours_daily",
                            "teacher": teacher_id,
                            "day": day,
                            "hours": daily_hours,
                            "max_allowed": teacher.max_periods_per_day,
                            "message": f"Teacher {teacher_id} exceeds daily hours on {day}: {daily_hours} > {teacher.max_periods_per_day}"
                        })
                        score -= 5
                
                # Check weekly hours
                if hours["weekly"] > teacher.max_periods_per_week:
                    violations.append({
                        "type": "teacher_max_hours_weekly",
                        "teacher": teacher_id,
                        "hours": hours["weekly"],
                        "max_allowed": teacher.max_periods_per_week,
                        "message": f"Teacher {teacher_id} exceeds weekly hours: {hours['weekly']} > {teacher.max_periods_per_week}"
                    })
                    score -= 5
        
        # Check subject spacing (no back-to-back same subject)
        class_subject_slots = {}
        for entry in solution:
            class_id = entry.class_id
            subject_id = entry.subject_id
            day = entry.day
            start_time = entry.start_time
            
            if class_id not in class_subject_slots:
                class_subject_slots[class_id] = {}
            if day not in class_subject_slots[class_id]:
                class_subject_slots[class_id][day] = {}
            if subject_id not in class_subject_slots[class_id][day]:
                class_subject_slots[class_id][day][subject_id] = []
            
            class_subject_slots[class_id][day][subject_id].append(start_time)
        
        for class_id, days in class_subject_slots.items():
            for day, subjects in days.items():
                for subject_id, times in subjects.items():
                    # Sort times and check for consecutive slots
                    times.sort()
                    for i in range(len(times) - 1):
                        time1 = times[i]
                        time2 = times[i + 1]
                        
                        # Check if times are consecutive (assuming 1-hour slots)
                        time_diff = (time2.hour - time1.hour) * 60 + (time2.minute - time1.minute)
                        if time_diff == 60:  # Consecutive hours
                            violations.append({
                                "type": "subject_spacing_violation",
                                "class": class_id,
                                "subject": subject_id,
                                "day": day,
                                "times": [time1, time2],
                                "message": f"Subject {subject_id} scheduled back-to-back for class {class_id} on {day}: {time1} and {time2}"
                            })
                            score -= 3
        
        # Check class gaps (warnings for gaps)
        for class_id, days in class_subject_slots.items():
            for day, subjects in days.items():
                all_times = []
                for subject_times in subjects.values():
                    all_times.extend(subject_times)
                
                if len(all_times) > 1:
                    all_times.sort()
                    gaps = 0
                    for i in range(len(all_times) - 1):
                        time1 = all_times[i]
                        time2 = all_times[i + 1]
                        time_diff = (time2.hour - time1.hour) * 60 + (time2.minute - time1.minute)
                        if time_diff > 60:  # Gap of more than 1 hour
                            gaps += 1
                    
                    if gaps > 0:
                        warnings.append({
                            "type": "class_gaps",
                            "class": class_id,
                            "day": day,
                            "gaps": gaps,
                            "message": f"Class {class_id} has {gaps} gaps on {day}"
                        })
                        score -= gaps * 1  # Small penalty for gaps
        
        is_valid = len(violations) == 0
        score = max(0, score)  # Ensure score doesn't go below 0
        return ValidationResult(
            is_valid=is_valid,
            violations=violations,
            warnings=warnings,
            score=score
        )
    
    def get_statistics(self) -> SolverStatistics:
        """Get solver statistics (no room logic)"""
        solve_time = self.end_time - self.start_time if self.end_time and self.start_time else 0
        return SolverStatistics(
            solve_time_seconds=solve_time,
            variables_count=self.variables_count,
            constraints_count=self.constraints_count,
            objective_value=self.solver.ObjectiveValue() if self.solver else None,
            solution_quality="optimal" if self.solver and self.solver.StatusName() == "OPTIMAL" else "feasible"
        ) 