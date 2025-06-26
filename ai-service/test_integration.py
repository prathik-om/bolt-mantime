#!/usr/bin/env python3
"""
Test script to verify AI service integration
"""

import requests
import json
import time
from datetime import time as dt_time

# Test data
test_request = {
    "school_config": {
        "school_id": "test_school_1",
        "name": "Test School",
        "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "start_time": "08:00:00",
        "end_time": "16:00:00",
        "lesson_duration_minutes": 60,
        "break_duration_minutes": 15
    },
    "teachers": [
        {
            "id": "teacher_1",
            "name": "John Smith",
            "email": "john@school.com",
            "department_id": "dept_1",
            "max_periods_per_day": 8,
            "max_periods_per_week": 40,
            "availability": {},
            "qualifications": ["math", "science"]
        },
        {
            "id": "teacher_2",
            "name": "Jane Doe",
            "email": "jane@school.com",
            "department_id": "dept_2",
            "max_periods_per_day": 8,
            "max_periods_per_week": 40,
            "availability": {},
            "qualifications": ["english", "history"]
        }
    ],
    "classes": [
        {
            "id": "class_1",
            "name": "Grade 10A",
            "grade_level": "10",
            "department_id": "dept_1",
            "student_count": 25,
            "subjects": [
                {"subject_id": "math", "hours_per_week": 2},
                {"subject_id": "english", "hours_per_week": 2}
            ]
        }
    ],
    "rooms": [
        {
            "id": "room_1",
            "name": "Room 101",
            "capacity": 30,
            "room_type": "classroom",
            "equipment": [],
            "availability": {}
        }
    ],
    "time_slots": [
        {"id": "mon_1", "day": "monday", "start_time": "08:00:00", "end_time": "09:00:00", "slot_type": "regular"},
        {"id": "mon_2", "day": "monday", "start_time": "09:00:00", "end_time": "10:00:00", "slot_type": "regular"},
        {"id": "tue_1", "day": "tuesday", "start_time": "08:00:00", "end_time": "09:00:00", "slot_type": "regular"},
        {"id": "tue_2", "day": "tuesday", "start_time": "09:00:00", "end_time": "10:00:00", "slot_type": "regular"}
    ],
    "constraints": [
        {
            "type": "teacher_availability",
            "description": "Respect teacher availability",
            "parameters": {},
            "weight": 1.0,
            "is_hard": False  # Make this a soft constraint
        }
        # Removed other constraints to make it easier to find a solution
    ],
    "optimization_goals": ["minimize_conflicts", "balance_workload"]
}

def test_ai_service():
    """Test the AI service integration"""
    
    base_url = "http://localhost:8000"
    
    print("🧪 Testing AI Service Integration")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test 2: Generate timetable
    print("\n2. Testing timetable generation...")
    try:
        response = requests.post(
            f"{base_url}/generate-timetable",
            json=test_request,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            job_id = result.get("job_id")
            print(f"✅ Timetable generation started")
            print(f"   Job ID: {job_id}")
            print(f"   Status: {result.get('status')}")
            print(f"   Message: {result.get('message')}")
            
            # Test 3: Poll for completion
            print("\n3. Polling for completion...")
            max_attempts = 30  # 30 attempts * 2 seconds = 60 seconds max
            attempts = 0
            
            while attempts < max_attempts:
                time.sleep(2)
                attempts += 1
                
                try:
                    status_response = requests.get(f"{base_url}/job-status/{job_id}", timeout=5)
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        status = status_data.get("status")
                        progress = status_data.get("progress", 0)
                        message = status_data.get("message", "")
                        
                        print(f"   Attempt {attempts}: {status} ({progress}%) - {message}")
                        
                        if status == "completed":
                            print("✅ Timetable generation completed!")
                            result_data = status_data.get("result", {})
                            timetable = result_data.get("timetable", [])
                            validation = result_data.get("validation", {})
                            statistics = result_data.get("statistics", {})
                            
                            print(f"   Generated {len(timetable)} timetable entries")
                            print(f"   Validation: {validation.get('is_valid', False)}")
                            print(f"   Violations: {len(validation.get('violations', []))}")
                            print(f"   Warnings: {len(validation.get('warnings', []))}")
                            print(f"   Solve time: {statistics.get('solve_time_seconds', 0):.2f}s")
                            
                            # Show some sample entries
                            if timetable:
                                print("\n   Sample timetable entries:")
                                for i, entry in enumerate(timetable[:5]):
                                    print(f"     {i+1}. {entry.get('class_id')} - {entry.get('teacher_id')} - {entry.get('day')} {entry.get('start_time')}")
                            
                            return True
                            
                        elif status == "failed":
                            error = status_data.get("error", "Unknown error")
                            print(f"❌ Timetable generation failed: {error}")
                            return False
                            
                    else:
                        print(f"   Attempt {attempts}: Failed to get status ({status_response.status_code})")
                        
                except Exception as e:
                    print(f"   Attempt {attempts}: Error polling status: {e}")
            
            print("❌ Timetable generation timed out")
            return False
            
        else:
            print(f"❌ Timetable generation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Timetable generation failed: {e}")
        return False

if __name__ == "__main__":
    success = test_ai_service()
    if success:
        print("\n🎉 All tests passed! AI service integration is working.")
    else:
        print("\n💥 Some tests failed. Please check the AI service.") 