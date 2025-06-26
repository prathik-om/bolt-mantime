# Time Slot Filtering Guide

This guide explains how to use the time slot filtering functionality to ensure your timetable solver only considers valid teaching slots.

## Overview

The time slot filtering system removes:
- **Weekend slots** (Saturday, Sunday)
- **Break slots** (break, lunch, recess)
- **Holiday slots** (custom holiday weekdays)
- **Non-teaching slots** (assembly, events, etc.)

## Quick Start

### 1. Import the Filtering Functions

```python
from time_slot_filter import (
    create_time_slot_filter_config,
    filter_slots_for_solver
)
```

### 2. Create Filter Configuration

```python
# Create configuration based on school settings
config = create_time_slot_filter_config(
    school_config=school_config,
    holidays=holiday_dates,  # Optional: List of holiday dates
    term_start=term_start,   # Optional: Term start date
    term_end=term_end,       # Optional: Term end date
    custom_holiday_weekdays={"friday"},  # Optional: Additional holiday weekdays
    custom_break_types={"assembly"}      # Optional: Additional break types
)
```

### 3. Filter Time Slots

```python
# Filter all time slots to get only valid teaching slots
filtered_time_slots = filter_slots_for_solver(all_time_slots, config)
```

### 4. Use with Solver

```python
# Create solver with filtered time slots
solver = TimetableSolver(
    school_config=school_config,
    teachers=teachers,
    classes=classes,
    rooms=rooms,
    time_slots=filtered_time_slots,  # Use filtered slots!
    constraints=constraints,
    departments=departments,
    subjects=subjects
)
```

## Configuration Options

### School Configuration
The filter automatically uses your school's working days:

```python
school_config = SchoolConfig(
    school_id="school_1",
    name="My School",
    working_days=["monday", "tuesday", "wednesday", "thursday", "friday"],
    start_time=time(8, 0),
    end_time=time(15, 0),
    lesson_duration_minutes=60,
    break_duration_minutes=15
)
```

### Holiday Weekdays
By default, weekends are treated as holidays. You can add more:

```python
config = create_time_slot_filter_config(
    school_config,
    custom_holiday_weekdays={"friday"}  # Make Friday a holiday
)
```

### Break Types
Default break types: `{"break", "lunch", "recess"}`. You can add more:

```python
config = create_time_slot_filter_config(
    school_config,
    custom_break_types={"assembly", "sports", "events"}
)
```

### Allowed Slot Types
By default, only `"regular"` slots are allowed. You can customize:

```python
# In the configuration, you can modify:
config["allowed_slot_types"] = {"regular", "lab", "practical"}
```

## Integration with Your API

### In Your FastAPI Endpoint

```python
@app.post("/generate-timetable")
async def generate_timetable(request: TimetableRequest):
    # 1. Load all data
    school_config = await load_school_config(request.school_id)
    all_time_slots = await load_time_slots(request.school_id)
    teachers = await load_teachers(request.school_id)
    classes = await load_classes(request.school_id)
    holidays = await load_holidays(request.school_id)
    
    # 2. Create filter configuration
    config = create_time_slot_filter_config(
        school_config=school_config,
        holidays=holidays
    )
    
    # 3. Filter time slots
    filtered_time_slots = filter_slots_for_solver(all_time_slots, config)
    
    # 4. Create and run solver
    solver = TimetableSolver(
        school_config=school_config,
        teachers=teachers,
        classes=classes,
        rooms=rooms,
        time_slots=filtered_time_slots,  # Use filtered slots
        constraints=request.constraints,
        departments=departments,
        subjects=subjects
    )
    
    # 5. Solve and return
    success = solver.solve(time_limit=request.time_limit)
    if success:
        return {"solution": solver.get_solution()}
    else:
        return {"error": "No feasible solution found"}
```

## Data Structure Requirements

### TimeSlot Model
Your time slots should have these fields:

```python
class TimeSlot:
    id: str
    day: str  # "monday", "tuesday", etc.
    start_time: time
    end_time: time
    slot_type: str  # "regular", "break", "lunch", etc.
```

### SchoolConfig Model
Your school configuration should have:

```python
class SchoolConfig:
    school_id: str
    name: str
    working_days: List[str]  # ["monday", "tuesday", ...]
    start_time: time
    end_time: time
    lesson_duration_minutes: int
    break_duration_minutes: int
```

## Testing

### Run the Test Scripts

```bash
# Test basic filtering
python test_time_slot_filter.py

# Test integration with solver
python integration_example.py
```

### Expected Output
- Original slots: 37 (including breaks and weekends)
- Filtered slots: 25 (only regular teaching slots)
- Solver uses only valid slots

## Benefits

1. **Automatic Holiday Handling**: No scheduling on weekends or holidays
2. **Break Management**: No lessons during breaks or lunch
3. **Flexible Configuration**: Easy to customize for different schools
4. **Performance**: Smaller problem size for the solver
5. **Accuracy**: Ensures realistic timetables

## Troubleshooting

### No Solution Found
If the solver can't find a solution after filtering:

1. **Check available slots**: Ensure you have enough teaching slots
2. **Verify teacher availability**: Make sure teachers can teach required subjects
3. **Review constraints**: Some constraints might be too restrictive
4. **Add more resources**: More teachers, time slots, or rooms

### Filtering Too Aggressive
If too many slots are being filtered:

1. **Check working days**: Verify school working days configuration
2. **Review break types**: Ensure break types match your data
3. **Customize allowed types**: Add more slot types to `allowed_slot_types`

## Migration from Current System

If you're currently passing all time slots to the solver:

1. **Add filtering step** before solver creation
2. **Update API endpoints** to use filtered slots
3. **Test thoroughly** to ensure no functionality is lost
4. **Monitor performance** - filtering should improve solver speed

## Next Steps

1. **Integrate with your database**: Load holidays and term dates from your database
2. **Add date-based filtering**: Extend to handle actual calendar dates
3. **Customize for your school**: Adjust break types and working days
4. **Add validation**: Ensure filtered slots meet minimum requirements

## Support

For questions or issues:
1. Check the test scripts for examples
2. Review the integration example
3. Test with your actual data structure
4. Adjust configuration parameters as needed 