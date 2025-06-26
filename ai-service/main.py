from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import uuid
import asyncio
from datetime import datetime, timedelta
import json

from timetable_solver import TimetableSolver
from time_slot_filter import create_time_slot_filter_config, filter_slots_for_solver
from models import (
    TimetableRequest,
    TimetableResponse,
    JobStatus,
    SchoolConfig,
    Teacher,
    Class,
    Room,
    TimeSlot,
    Constraint
)

app = FastAPI(title="AI Timetable Generator", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job storage (in production, use Redis or database)
jobs: Dict[str, Dict[str, Any]] = {}

@app.get("/")
async def root():
    return {"message": "AI Timetable Generator Service"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/generate-timetable", response_model=TimetableResponse)
async def generate_timetable(
    request: TimetableRequest,
    background_tasks: BackgroundTasks
):
    """Generate a timetable using OR-Tools constraint programming"""
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    jobs[job_id] = {
        "status": JobStatus.PENDING,
        "progress": 0,
        "message": "Initializing timetable generation...",
        "created_at": datetime.now().isoformat(),
        "request": request.dict(),
        "result": None,
        "error": None
    }
    
    # Start background task
    background_tasks.add_task(generate_timetable_task, job_id, request)
    
    return TimetableResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        message="Timetable generation started"
    )

@app.get("/job-status/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a timetable generation job"""
    
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "message": job["message"],
        "created_at": job["created_at"],
        "result": job["result"],
        "error": job["error"]
    }

async def generate_timetable_task(job_id: str, request: TimetableRequest):
    """Background task to generate timetable"""
    
    try:
        # Update status to processing
        jobs[job_id]["status"] = JobStatus.PROCESSING
        jobs[job_id]["progress"] = 10
        jobs[job_id]["message"] = "Validating input data..."
        
        # Validate input data
        if not request.classes or not request.teachers or not request.rooms:
            raise ValueError("Missing required data: classes, teachers, or rooms")
        
        # Update progress - Time slot filtering
        jobs[job_id]["progress"] = 15
        jobs[job_id]["message"] = "Filtering time slots..."
        
        # Create filter configuration
        filter_config = create_time_slot_filter_config(
            school_config=request.school_config,
            holidays=request.holidays,
            term_start=request.term_start,
            term_end=request.term_end,
            custom_holiday_weekdays=request.custom_holiday_weekdays,
            custom_break_types=request.custom_break_types
        )
        
        # Filter time slots to remove weekends, breaks, and holidays
        original_slot_count = len(request.time_slots)
        filtered_time_slots = filter_slots_for_solver(request.time_slots, filter_config)
        filtered_slot_count = len(filtered_time_slots)
        
        # Log filtering results
        removed_slots = original_slot_count - filtered_slot_count
        jobs[job_id]["message"] = f"Filtered time slots: {original_slot_count} → {filtered_slot_count} (removed {removed_slots})"
        
        # Update progress
        jobs[job_id]["progress"] = 20
        jobs[job_id]["message"] = "Initializing OR-Tools solver..."
        
        # Create solver instance with filtered time slots
        solver = TimetableSolver(
            school_config=request.school_config,
            teachers=request.teachers,
            classes=request.classes,
            rooms=request.rooms,
            time_slots=filtered_time_slots,  # Use filtered slots!
            constraints=request.constraints
        )
        
        # Update progress
        jobs[job_id]["progress"] = 30
        jobs[job_id]["message"] = "Building constraint model..."
        
        # Build the model
        solver.build_model()
        
        # Update progress
        jobs[job_id]["progress"] = 50
        jobs[job_id]["message"] = "Solving timetable constraints..."
        
        # Solve the problem
        success = solver.solve()
        
        if not success:
            jobs[job_id]["status"] = JobStatus.FAILED
            jobs[job_id]["progress"] = 100
            jobs[job_id]["message"] = "No feasible solution found"
            jobs[job_id]["error"] = "The timetable constraints cannot be satisfied"
            return
        
        # Update progress
        jobs[job_id]["progress"] = 80
        jobs[job_id]["message"] = "Extracting solution..."
        
        # Extract solution
        solution = solver.get_solution()
        
        # Update progress
        jobs[job_id]["progress"] = 90
        jobs[job_id]["message"] = "Validating solution..."
        
        # Validate solution
        validation_result = solver.validate_solution(solution)
        
        # Update final status
        jobs[job_id]["status"] = JobStatus.COMPLETED
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = "Timetable generated successfully"
        jobs[job_id]["result"] = {
            "timetable": solution,
            "validation": validation_result,
            "statistics": solver.get_statistics(),
            "filtering_info": {
                "original_slots": original_slot_count,
                "filtered_slots": filtered_slot_count,
                "removed_slots": removed_slots,
                "filter_config": filter_config
            },
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        jobs[job_id]["status"] = JobStatus.FAILED
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = f"Error: {str(e)}"
        jobs[job_id]["error"] = str(e)

@app.get("/jobs")
async def list_jobs():
    """List all jobs (for debugging)"""
    return {
        "jobs": [
            {
                "job_id": job_id,
                "status": job["status"],
                "progress": job["progress"],
                "created_at": job["created_at"]
            }
            for job_id, job in jobs.items()
        ]
    }

# New endpoint to test time slot filtering
@app.post("/test-time-slot-filtering")
async def test_time_slot_filtering(request: TimetableRequest):
    """Test endpoint to see how time slot filtering works"""
    
    try:
        # Create filter configuration
        filter_config = create_time_slot_filter_config(
            school_config=request.school_config,
            holidays=request.holidays,
            term_start=request.term_start,
            term_end=request.term_end,
            custom_holiday_weekdays=request.custom_holiday_weekdays,
            custom_break_types=request.custom_break_types
        )
        
        # Filter time slots
        original_slots = request.time_slots
        filtered_slots = filter_slots_for_solver(original_slots, filter_config)
        
        # Analyze what was filtered
        original_breakdown = {}
        filtered_breakdown = {}
        
        for slot in original_slots:
            day = slot.day
            slot_type = slot.slot_type
            original_breakdown[f"{day}_{slot_type}"] = original_breakdown.get(f"{day}_{slot_type}", 0) + 1
            
        for slot in filtered_slots:
            day = slot.day
            slot_type = slot.slot_type
            filtered_breakdown[f"{day}_{slot_type}"] = filtered_breakdown.get(f"{day}_{slot_type}", 0) + 1
        
        return {
            "success": True,
            "filter_config": filter_config,
            "original_slots": len(original_slots),
            "filtered_slots": len(filtered_slots),
            "removed_slots": len(original_slots) - len(filtered_slots),
            "original_breakdown": original_breakdown,
            "filtered_breakdown": filtered_breakdown,
            "removed_slots_detail": {
                "weekend_slots": sum(1 for s in original_slots if s.day.lower() in ["saturday", "sunday"]),
                "break_slots": sum(1 for s in original_slots if s.slot_type in ["break", "lunch", "recess"]),
                "other_filtered": len(original_slots) - len(filtered_slots) - 
                                sum(1 for s in original_slots if s.day.lower() in ["saturday", "sunday"]) -
                                sum(1 for s in original_slots if s.slot_type in ["break", "lunch", "recess"])
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 