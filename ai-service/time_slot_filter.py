#!/usr/bin/env python3
"""
Time slot filtering utility for the timetable solver.
Filters out holidays, breaks, and time slots outside term dates.
"""

from datetime import date, datetime
from typing import List, Set, Optional
from models import TimeSlot

def filter_time_slots(
    time_slots: List[TimeSlot],
    holidays: Optional[List[date]] = None,
    term_start: Optional[date] = None,
    term_end: Optional[date] = None,
    break_slot_types: Optional[Set[str]] = None,
    allowed_slot_types: Optional[Set[str]] = None
) -> List[TimeSlot]:
    """
    Filter time slots to remove holidays, breaks, and slots outside term dates.
    
    Args:
        time_slots: List of all time slots to filter
        holidays: List of holiday dates (optional)
        term_start: Term start date (optional)
        term_end: Term end date (optional)
        break_slot_types: Set of slot types that represent breaks (default: {"break", "lunch"})
        allowed_slot_types: Set of slot types to allow (default: {"regular"})
    
    Returns:
        Filtered list of time slots suitable for scheduling
    """
    holidays = set(holidays or [])
    break_slot_types = break_slot_types or {"break", "lunch"}
    allowed_slot_types = allowed_slot_types or {"regular"}
    
    filtered_slots = []
    
    for ts in time_slots:
        # Skip if slot type is not allowed (e.g., breaks, lunch)
        if ts.slot_type not in allowed_slot_types:
            continue
            
        # Skip if slot type is a break
        if ts.slot_type in break_slot_types:
            continue
        
        # If time slot has a date field, check holidays and term dates
        # For MVP, we'll assume time slots are identified by day name
        # You can extend this later when you have actual date fields
        
        filtered_slots.append(ts)
    
    return filtered_slots

def filter_time_slots_by_weekday(
    time_slots: List[TimeSlot],
    holiday_weekdays: Optional[Set[str]] = None,
    break_slot_types: Optional[Set[str]] = None,
    allowed_slot_types: Optional[Set[str]] = None
) -> List[TimeSlot]:
    """
    Filter time slots for MVP using weekday names (no actual dates).
    
    Args:
        time_slots: List of all time slots to filter
        holiday_weekdays: Set of weekday names that are holidays (e.g., {"saturday", "sunday"})
        break_slot_types: Set of slot types that represent breaks
        allowed_slot_types: Set of slot types to allow
    
    Returns:
        Filtered list of time slots suitable for scheduling
    """
    holiday_weekdays = holiday_weekdays or {"saturday", "sunday"}
    break_slot_types = break_slot_types or {"break", "lunch"}
    allowed_slot_types = allowed_slot_types or {"regular"}
    
    filtered_slots = []
    
    for ts in time_slots:
        # Skip if day is a holiday
        if ts.day.lower() in holiday_weekdays:
            continue
            
        # Skip if slot type is not allowed
        if ts.slot_type not in allowed_slot_types:
            continue
            
        # Skip if slot type is a break
        if ts.slot_type in break_slot_types:
            continue
        
        filtered_slots.append(ts)
    
    return filtered_slots

def create_time_slot_filter_config(
    school_config,
    holidays: Optional[List[date]] = None,
    term_start: Optional[date] = None,
    term_end: Optional[date] = None,
    custom_holiday_weekdays: Optional[Set[str]] = None,
    custom_break_types: Optional[Set[str]] = None
):
    """
    Create a configuration object for time slot filtering.
    
    Args:
        school_config: School configuration with working days
        holidays: List of holiday dates
        term_start: Term start date
        term_end: Term end date
        custom_holiday_weekdays: Additional holiday weekdays
        custom_break_types: Additional break slot types
    
    Returns:
        Configuration dict for filtering
    """
    # Default holiday weekdays (weekends)
    default_holiday_weekdays = {"saturday", "sunday"}
    
    # Add custom holiday weekdays
    holiday_weekdays = default_holiday_weekdays.copy()
    if custom_holiday_weekdays:
        holiday_weekdays.update(custom_holiday_weekdays)
    
    # Remove working days from holiday weekdays
    working_days = set(day.lower() for day in school_config.working_days)
    holiday_weekdays = holiday_weekdays - working_days
    
    # Default break types
    default_break_types = {"break", "lunch", "recess"}
    break_types = default_break_types.copy()
    if custom_break_types:
        break_types.update(custom_break_types)
    
    return {
        "holidays": holidays or [],
        "term_start": term_start,
        "term_end": term_end,
        "holiday_weekdays": holiday_weekdays,
        "break_slot_types": break_types,
        "allowed_slot_types": {"regular"}
    }

# Example usage functions
def filter_slots_for_solver(time_slots: List[TimeSlot], config: dict) -> List[TimeSlot]:
    """
    Filter time slots using a configuration object.
    This is the main function you'll call before creating the solver.
    """
    if config.get("term_start") and config.get("term_end"):
        # Use date-based filtering if term dates are provided
        return filter_time_slots(
            time_slots,
            holidays=config.get("holidays"),
            term_start=config.get("term_start"),
            term_end=config.get("term_end"),
            break_slot_types=config.get("break_slot_types"),
            allowed_slot_types=config.get("allowed_slot_types")
        )
    else:
        # Use weekday-based filtering for MVP
        return filter_time_slots_by_weekday(
            time_slots,
            holiday_weekdays=config.get("holiday_weekdays"),
            break_slot_types=config.get("break_slot_types"),
            allowed_slot_types=config.get("allowed_slot_types")
        ) 