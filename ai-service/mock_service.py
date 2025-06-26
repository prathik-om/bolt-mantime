#!/usr/bin/env python3
"""
Mock AI service for testing integration
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import uuid
import time
from datetime import datetime

app = FastAPI(title="Mock AI Timetable Generator", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock job storage
jobs: Dict[str, Dict[str, Any]] = {}

@app.get("/")
async def root():
    return {"message": "Mock AI Timetable Generator Service"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/generate-timetable")
async def generate_timetable(request: Dict[str, Any]):
    """Mock timetable generation"""
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "message": "Initializing timetable generation...",
        "created_at": datetime.now().isoformat(),
        "request": request,
        "result": None,
        "error": None
    }
    
    # Simulate background processing
    import asyncio
    asyncio.create_task(mock_generation_task(job_id, request))
    
    return {
        "job_id": job_id,
        "status": "pending",
        "message": "Timetable generation started"
    }

@app.get("/job-status/{job_id}")
async def get_job_status(job_id: str):
    """Get mock job status"""
    
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

async def mock_generation_task(job_id: str, request: Dict[str, Any]):
    """Mock background task"""
    
    try:
        # Simulate processing steps
        steps = [
            (10, "Validating input data..."),
            (20, "Filtering time slots..."),
            (30, "Building constraint model..."),
            (50, "Solving timetable constraints..."),
            (80, "Extracting solution..."),
            (90, "Validating solution..."),
            (100, "Timetable generated successfully")
        ]
        
        for progress, message in steps:
            jobs[job_id]["progress"] = progress
            jobs[job_id]["message"] = message
            jobs[job_id]["status"] = "processing"
            
            # Simulate processing time
            await asyncio.sleep(1)
        
        # Generate mock timetable
        mock_timetable = generate_mock_timetable(request)
        
        # Update final status
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = "Timetable generated successfully"
        jobs[job_id]["result"] = {
            "timetable": mock_timetable,
            "validation": {
                "is_valid": True,
                "violations": [],
                "warnings": [
                    {"message": "Some teachers have high workload"},
                    {"message": "Room conflicts detected in 2 periods"}
                ],
                "score": 0.95
            },
            "statistics": {
                "solve_time_seconds": 2.5,
                "variables_count": 150,
                "constraints_count": 75,
                "objective_value": 0.95,
                "solution_quality": "optimal"
            },
            "filtering_info": {
                "original_slots": 30,
                "filtered_slots": 25,
                "removed_slots": 5,
                "filter_config": {"exclude_weekends": True, "exclude_breaks": True}
            },
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = f"Error: {str(e)}"
        jobs[job_id]["error"] = str(e)

def generate_mock_timetable(request: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate a mock timetable"""
    
    timetable = []
    classes = request.get("classes", [])
    teachers = request.get("teachers", [])
    time_slots = request.get("time_slots", [])
    
    if not classes or not teachers or not time_slots:
        return []
    
    # Generate some mock entries
    for i, cls in enumerate(classes[:5]):  # Limit to 5 classes for demo
        for j, teacher in enumerate(teachers[:3]):  # Limit to 3 teachers
            if i * 3 + j < len(time_slots):
                slot = time_slots[i * 3 + j]
                timetable.append({
                    "class_id": cls["id"],
                    "teacher_id": teacher["id"],
                    "room_id": "room_1",  # Mock room
                    "time_slot_id": slot["id"],
                    "subject_id": f"subject_{i}_{j}",
                    "day": slot["day"],
                    "start_time": slot["start_time"],
                    "end_time": slot["end_time"]
                })
    
    return timetable

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000) 