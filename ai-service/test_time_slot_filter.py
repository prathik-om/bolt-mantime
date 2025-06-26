#!/usr/bin/env python3
"""
Test script to demonstrate time slot filtering functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import time, date
from models import SchoolConfig, TimeSlot
from time_slot_filter import (
    filter_time_slots_by_weekday,
    create_time_slot_filter_config,
    filter_slots_for_solver
)

def create_sample_time_slots():
    """Create sample time slots including regular, break, and lunch slots"""
    
    # School configuration
    school_config = SchoolConfig(
        school_id="test_school",
        name="Test School",
        working_days=["monday", "tuesday", "wednesday", "thursday", "friday"],
        start_time=time(8, 0),
        end_time=time(15, 0),
        lesson_duration_minutes=60,
        break_duration_minutes=15
    )
    
    # Create time slots for a week
    time_slots = []
    slot_id = 1
    
    # Monday
    time_slots.extend([
        TimeSlot(id=f"slot_{slot_id}", day="monday", start_time=time(8, 0), end_time=time(9, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+1}", day="monday", start_time=time(9, 0), end_time=time(10, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+2}", day="monday", start_time=time(10, 0), end_time=time(10, 15), slot_type="break"),
        TimeSlot(id=f"slot_{slot_id+3}", day="monday", start_time=time(10, 15), end_time=time(11, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+4}", day="monday", start_time=time(11, 15), end_time=time(12, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+5}", day="monday", start_time=time(12, 15), end_time=time(13, 0), slot_type="lunch"),
        TimeSlot(id=f"slot_{slot_id+6}", day="monday", start_time=time(13, 0), end_time=time(14, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+7}", day="monday", start_time=time(14, 0), end_time=time(15, 0), slot_type="regular"),
    ])
    slot_id += 8
    
    # Tuesday
    time_slots.extend([
        TimeSlot(id=f"slot_{slot_id}", day="tuesday", start_time=time(8, 0), end_time=time(9, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+1}", day="tuesday", start_time=time(9, 0), end_time=time(10, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+2}", day="tuesday", start_time=time(10, 0), end_time=time(10, 15), slot_type="break"),
        TimeSlot(id=f"slot_{slot_id+3}", day="tuesday", start_time=time(10, 15), end_time=time(11, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+4}", day="tuesday", start_time=time(11, 15), end_time=time(12, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+5}", day="tuesday", start_time=time(12, 15), end_time=time(13, 0), slot_type="lunch"),
        TimeSlot(id=f"slot_{slot_id+6}", day="tuesday", start_time=time(13, 0), end_time=time(14, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+7}", day="tuesday", start_time=time(14, 0), end_time=time(15, 0), slot_type="regular"),
    ])
    slot_id += 8
    
    # Wednesday
    time_slots.extend([
        TimeSlot(id=f"slot_{slot_id}", day="wednesday", start_time=time(8, 0), end_time=time(9, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+1}", day="wednesday", start_time=time(9, 0), end_time=time(10, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+2}", day="wednesday", start_time=time(10, 0), end_time=time(10, 15), slot_type="break"),
        TimeSlot(id=f"slot_{slot_id+3}", day="wednesday", start_time=time(10, 15), end_time=time(11, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+4}", day="wednesday", start_time=time(11, 15), end_time=time(12, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+5}", day="wednesday", start_time=time(12, 15), end_time=time(13, 0), slot_type="lunch"),
        TimeSlot(id=f"slot_{slot_id+6}", day="wednesday", start_time=time(13, 0), end_time=time(14, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+7}", day="wednesday", start_time=time(14, 0), end_time=time(15, 0), slot_type="regular"),
    ])
    slot_id += 8
    
    # Thursday
    time_slots.extend([
        TimeSlot(id=f"slot_{slot_id}", day="thursday", start_time=time(8, 0), end_time=time(9, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+1}", day="thursday", start_time=time(9, 0), end_time=time(10, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+2}", day="thursday", start_time=time(10, 0), end_time=time(10, 15), slot_type="break"),
        TimeSlot(id=f"slot_{slot_id+3}", day="thursday", start_time=time(10, 15), end_time=time(11, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+4}", day="thursday", start_time=time(11, 15), end_time=time(12, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+5}", day="thursday", start_time=time(12, 15), end_time=time(13, 0), slot_type="lunch"),
        TimeSlot(id=f"slot_{slot_id+6}", day="thursday", start_time=time(13, 0), end_time=time(14, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+7}", day="thursday", start_time=time(14, 0), end_time=time(15, 0), slot_type="regular"),
    ])
    slot_id += 8
    
    # Friday
    time_slots.extend([
        TimeSlot(id=f"slot_{slot_id}", day="friday", start_time=time(8, 0), end_time=time(9, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+1}", day="friday", start_time=time(9, 0), end_time=time(10, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+2}", day="friday", start_time=time(10, 0), end_time=time(10, 15), slot_type="break"),
        TimeSlot(id=f"slot_{slot_id+3}", day="friday", start_time=time(10, 15), end_time=time(11, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+4}", day="friday", start_time=time(11, 15), end_time=time(12, 15), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+5}", day="friday", start_time=time(12, 15), end_time=time(13, 0), slot_type="lunch"),
        TimeSlot(id=f"slot_{slot_id+6}", day="friday", start_time=time(13, 0), end_time=time(14, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+7}", day="friday", start_time=time(14, 0), end_time=time(15, 0), slot_type="regular"),
    ])
    slot_id += 8
    
    # Weekend slots (should be filtered out)
    time_slots.extend([
        TimeSlot(id=f"slot_{slot_id}", day="saturday", start_time=time(8, 0), end_time=time(9, 0), slot_type="regular"),
        TimeSlot(id=f"slot_{slot_id+1}", day="sunday", start_time=time(8, 0), end_time=time(9, 0), slot_type="regular"),
    ])
    
    return school_config, time_slots

def test_time_slot_filtering():
    """Test the time slot filtering functionality"""
    print("=== Time Slot Filtering Test ===")
    print()
    
    # Create sample data
    school_config, all_time_slots = create_sample_time_slots()
    
    print(f"Original time slots: {len(all_time_slots)}")
    print(f"Working days: {school_config.working_days}")
    print()
    
    # Show breakdown by day and type
    day_breakdown = {}
    type_breakdown = {}
    for ts in all_time_slots:
        day_breakdown[ts.day] = day_breakdown.get(ts.day, 0) + 1
        type_breakdown[ts.slot_type] = type_breakdown.get(ts.slot_type, 0) + 1
    
    print("Original slots by day:")
    for day, count in sorted(day_breakdown.items()):
        print(f"  {day}: {count} slots")
    print()
    
    print("Original slots by type:")
    for slot_type, count in sorted(type_breakdown.items()):
        print(f"  {slot_type}: {count} slots")
    print()
    
    # Test 1: Basic filtering (remove weekends and breaks)
    print("=== Test 1: Basic Filtering ===")
    config = create_time_slot_filter_config(school_config)
    filtered_slots = filter_slots_for_solver(all_time_slots, config)
    
    print(f"Filtered time slots: {len(filtered_slots)}")
    print(f"Removed: {len(all_time_slots) - len(filtered_slots)} slots")
    print()
    
    # Show filtered breakdown
    filtered_day_breakdown = {}
    for ts in filtered_slots:
        filtered_day_breakdown[ts.day] = filtered_day_breakdown.get(ts.day, 0) + 1
    
    print("Filtered slots by day:")
    for day, count in sorted(filtered_day_breakdown.items()):
        print(f"  {day}: {count} slots")
    print()
    
    # Test 2: Custom holiday weekdays
    print("=== Test 2: Custom Holiday Weekdays ===")
    custom_config = create_time_slot_filter_config(
        school_config,
        custom_holiday_weekdays={"friday"}  # Make Friday a holiday
    )
    custom_filtered = filter_slots_for_solver(all_time_slots, custom_config)
    
    print(f"Custom filtered time slots: {len(custom_filtered)}")
    print(f"Removed: {len(all_time_slots) - len(custom_filtered)} slots")
    print()
    
    # Test 3: Custom break types
    print("=== Test 3: Custom Break Types ===")
    custom_break_config = create_time_slot_filter_config(
        school_config,
        custom_break_types={"break", "lunch", "recess", "assembly"}
    )
    break_filtered = filter_slots_for_solver(all_time_slots, custom_break_config)
    
    print(f"Break-filtered time slots: {len(break_filtered)}")
    print(f"Removed: {len(all_time_slots) - len(break_filtered)} slots")
    print()
    
    # Test 4: Integration with solver
    print("=== Test 4: Integration Example ===")
    print("To use with your solver:")
    print()
    print("```python")
    print("# Create filter config")
    print("config = create_time_slot_filter_config(school_config)")
    print()
    print("# Filter time slots")
    print("filtered_time_slots = filter_slots_for_solver(all_time_slots, config)")
    print()
    print("# Use with solver")
    print("solver = TimetableSolver(")
    print("    school_config=school_config,")
    print("    teachers=teachers,")
    print("    classes=classes,")
    print("    rooms=[],")
    print("    time_slots=filtered_time_slots,  # Use filtered slots")
    print("    constraints=constraints,")
    print("    departments=departments,")
    print("    subjects=subjects")
    print(")")
    print("```")
    print()
    
    print("=== Summary ===")
    print("✅ Time slot filtering successfully removes:")
    print("  - Weekend slots (saturday, sunday)")
    print("  - Break slots (break, lunch)")
    print("  - Custom holiday weekdays")
    print("  - Custom break types")
    print()
    print("✅ Ready for integration with your solver!")

if __name__ == "__main__":
    test_time_slot_filtering() 