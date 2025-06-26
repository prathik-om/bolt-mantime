from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Set
from enum import Enum
from datetime import time, date

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ConstraintType(str, Enum):
    TEACHER_AVAILABILITY = "teacher_availability"
    ROOM_CAPACITY = "room_capacity"
    SUBJECT_PREFERENCE = "subject_preference"
    TIME_SLOT_PREFERENCE = "time_slot_preference"
    CONSECUTIVE_LESSONS = "consecutive_lessons"
    BREAK_REQUIREMENTS = "break_requirements"
    MAX_LESSONS_PER_DAY = "max_lessons_per_day"
    MIN_LESSONS_PER_DAY = "min_lessons_per_day"

class SchoolConfig(BaseModel):
    school_id: str
    name: str
    working_days: List[str] = Field(default_factory=lambda: ["monday", "tuesday", "wednesday", "thursday", "friday"])
    start_time: time = Field(default=time(8, 0))
    end_time: time = Field(default=time(16, 0))
    lesson_duration_minutes: int = 60
    break_duration_minutes: int = 15

class Teacher(BaseModel):
    id: str
    name: str
    email: str
    department_id: Optional[str] = None
    max_periods_per_day: int = 8
    max_periods_per_week: int = 40
    availability: Dict[str, List[str]] = Field(default_factory=dict)  # day -> list of time slots
    qualifications: List[str] = Field(default_factory=list)

class Class(BaseModel):
    id: str
    name: str
    grade_level: str
    department_id: Optional[str] = None
    student_count: int
    subjects: List[Dict[str, Any]] = Field(default_factory=list)  # subject_id, hours_per_week, etc.

class Room(BaseModel):
    id: str
    name: str
    capacity: int
    room_type: str = "classroom"  # classroom, lab, gym, etc.
    equipment: List[str] = Field(default_factory=list)
    availability: Dict[str, List[str]] = Field(default_factory=dict)

class TimeSlot(BaseModel):
    id: str
    day: str
    start_time: time
    end_time: time
    slot_type: str = "regular"  # regular, break, lunch, etc.

class Constraint(BaseModel):
    type: ConstraintType
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    weight: float = 1.0  # importance of this constraint
    is_hard: bool = True  # hard constraint (must be satisfied) vs soft constraint

class TimetableRequest(BaseModel):
    school_config: SchoolConfig
    teachers: List[Teacher]
    classes: List[Class]
    rooms: List[Room]
    time_slots: List[TimeSlot]
    constraints: List[Constraint] = Field(default_factory=list)
    optimization_goals: List[str] = Field(default_factory=lambda: ["minimize_conflicts", "balance_workload"])
    
    # Optional filtering parameters for time slot filtering
    holidays: Optional[List[date]] = Field(default=None, description="List of holiday dates")
    term_start: Optional[date] = Field(default=None, description="Term start date")
    term_end: Optional[date] = Field(default=None, description="Term end date")
    custom_holiday_weekdays: Optional[Set[str]] = Field(default=None, description="Additional holiday weekdays")
    custom_break_types: Optional[Set[str]] = Field(default=None, description="Additional break slot types")

class TimetableResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str

class TimetableEntry(BaseModel):
    class_id: str
    teacher_id: str
    room_id: str
    time_slot_id: str
    subject_id: str
    day: str
    start_time: time
    end_time: time

class ValidationResult(BaseModel):
    is_valid: bool
    violations: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    score: float = 0.0

class SolverStatistics(BaseModel):
    solve_time_seconds: float
    variables_count: int
    constraints_count: int
    objective_value: Optional[float] = None
    solution_quality: str = "unknown"

class FilteringInfo(BaseModel):
    original_slots: int
    filtered_slots: int
    removed_slots: int
    filter_config: Dict[str, Any] 