#!/usr/bin/env python3
"""
Test script to verify API integration with time slot filtering
"""

import requests
import json
from datetime import time

def create_test_data():
    """Create test data for API testing"""
    
    # School configuration
    school_config = {
        "school_id": "test_school",
        "name": "Test School",
        "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "start_time": "08:00:00",
        "end_time": "14:00:00",
        "lesson_duration_minutes": 60,
        "break_duration_minutes": 15
    }
    
    # Create time slots (including breaks and weekends)
    time_slots = []
    slot_id = 1
    
    # Monday
    time_slots.extend([
        {"id": f"slot_{slot_id}", "day": "monday", "start_time": "08:00:00", "end_time": "09:00:00", "slot_type": "regular"},
        {"id": f"slot_{slot_id+1}", "day": "monday", "start_time": "09:00:00", "end_time": "10:00:00", "slot_type": "regular"},
        {"id": f"slot_{slot_id+2}", "day": "monday", "start_time": "10:00:00", "end_time": "10:15:00", "slot_type": "break"},
        {"id": f"slot_{slot_id+3}", "day": "monday", "start_time": "10:15:00", "end_time": "11:15:00", "slot_type": "regular"},
        {"id": f"slot_{slot_id+4}", "day": "monday", "start_time": "11:15:00", "end_time": "12:15:00", "slot_type": "regular"},
        {"id": f"slot_{slot_id+5}", "day": "monday", "start_time": "12:15:00", "end_time": "13:00:00", "slot_type": "lunch"},
        {"id": f"slot_{slot_id+6}", "day": "monday", "start_time": "13:00:00", "end_time": "14:00:00", "slot_type": "regular"},
    ])
    slot_id += 7
    
    # Tuesday
    time_slots.extend([
        {"id": f"slot_{slot_id}", "day": "tuesday", "start_time": "08:00:00", "end_time": "09:00:00", "slot_type": "regular"},
        {"id": f"slot_{slot_id+1}", "day": "tuesday", "start_time": "09:00:00", "end_time": "10:00:00", "slot_type": "regular"},
        {"id": f"slot_{slot_id+2}", "day": "tuesday", "start_time": "10:00:00", "end_time": "10:15:00", "slot_type": "break"},
        {"id": f"slot_{slot_id+3}", "day": "tuesday", "start_time": "10:15:00", "end_time": "11:15:00", "slot_type": "regular"},
        {"id": f"slot_{slot_id+4}", "day": "tuesday", "start_time": "11:15:00", "end_time": "12:15:00", "slot_type": "regular"},
        {"id": f"slot_{slot_id+5}", "day": "tuesday", "start_time": "12:15:00", "end_time": "13:00:00", "slot_type": "lunch"},
        {"id": f"slot_{slot_id+6}", "day": "tuesday", "start_time": "13:00:00", "end_time": "14:00:00", "slot_type": "regular"},
    ])
    slot_id += 7
    
    # Weekend slots (should be filtered out)
    time_slots.extend([
        {"id": f"slot_{slot_id}", "day": "saturday", "start_time": "08:00:00", "end_time": "09:00:00", "slot_type": "regular"},
        {"id": f"slot_{slot_id+1}", "day": "sunday", "start_time": "08:00:00", "end_time": "09:00:00", "slot_type": "regular"},
    ])
    
    # Teachers
    teachers = [
        {
            "id": "teacher_1",
            "name": "John Smith",
            "email": "john.smith@school.com",
            "department_id": "math_dept",
            "max_periods_per_day": 4,
            "max_periods_per_week": 20,
            "qualifications": ["mathematics"]
        }
    ]
    
    # Classes
    classes = [
        {
            "id": "class_1",
            "name": "Grade 10A",
            "grade_level": "10",
            "department_id": "general",
            "student_count": 20,
            "subjects": [
                {"subject_id": "math", "hours_per_week": 2}
            ]
        }
    ]
    
    # Rooms
    rooms = [
        {
            "id": "room_1",
            "name": "Classroom 101",
            "capacity": 30,
            "room_type": "classroom"
        }
    ]
    
    return {
        "school_config": school_config,
        "teachers": teachers,
        "classes": classes,
        "rooms": rooms,
        "time_slots": time_slots,
        "constraints": []
    }

def test_time_slot_filtering_endpoint():
    """Test the time slot filtering endpoint"""
    print("=== Testing Time Slot Filtering Endpoint ===")
    print()
    
    # Create test data
    test_data = create_test_data()
    
    # API endpoint
    url = "http://localhost:8000/test-time-slot-filtering"
    
    try:
        # Send request
        print("Sending request to test time slot filtering...")
        response = requests.post(url, json=test_data)
        
        if response.status_code == 200:
            result = response.json()
            
            if result["success"]:
                print("✅ Time slot filtering test successful!")
                print()
                print(f"Original slots: {result['original_slots']}")
                print(f"Filtered slots: {result['filtered_slots']}")
                print(f"Removed slots: {result['removed_slots']}")
                print()
                
                print("Filter configuration:")
                for key, value in result['filter_config'].items():
                    print(f"  {key}: {value}")
                print()
                
                print("Removed slots breakdown:")
                for key, value in result['removed_slots_detail'].items():
                    print(f"  {key}: {value}")
                print()
                
                print("Original breakdown:")
                for key, value in result['original_breakdown'].items():
                    print(f"  {key}: {value}")
                print()
                
                print("Filtered breakdown:")
                for key, value in result['filtered_breakdown'].items():
                    print(f"  {key}: {value}")
                
            else:
                print("❌ Time slot filtering test failed:")
                print(f"Error: {result['error']}")
                
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the API server is running on localhost:8000")
        print("Run: python main.py")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_timetable_generation_endpoint():
    """Test the main timetable generation endpoint"""
    print("=== Testing Timetable Generation Endpoint ===")
    print()
    
    # Create test data
    test_data = create_test_data()
    
    # API endpoint
    url = "http://localhost:8000/generate-timetable"
    
    try:
        # Send request
        print("Sending request to generate timetable...")
        response = requests.post(url, json=test_data)
        
        if response.status_code == 200:
            result = response.json()
            job_id = result["job_id"]
            
            print(f"✅ Timetable generation started!")
            print(f"Job ID: {job_id}")
            print()
            
            # Poll for job status
            print("Polling for job status...")
            status_url = f"http://localhost:8000/job-status/{job_id}"
            
            import time
            for i in range(10):  # Poll for up to 10 seconds
                time.sleep(1)
                status_response = requests.get(status_url)
                
                if status_response.status_code == 200:
                    status_result = status_response.json()
                    print(f"Status: {status_result['status']} - {status_result['message']}")
                    
                    if status_result['status'] in ['completed', 'failed']:
                        if status_result['status'] == 'completed':
                            print("✅ Timetable generated successfully!")
                            if 'filtering_info' in status_result['result']:
                                filtering_info = status_result['result']['filtering_info']
                                print(f"Filtering: {filtering_info['original_slots']} → {filtering_info['filtered_slots']} slots")
                        else:
                            print(f"❌ Timetable generation failed: {status_result['error']}")
                        break
                else:
                    print(f"❌ Error getting job status: {status_response.status_code}")
                    break
                    
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the API server is running on localhost:8000")
        print("Run: python main.py")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    """Run all tests"""
    print("API Integration Tests")
    print("=" * 50)
    print()
    
    # Test 1: Time slot filtering endpoint
    test_time_slot_filtering_endpoint()
    print()
    print("-" * 50)
    print()
    
    # Test 2: Timetable generation endpoint
    test_timetable_generation_endpoint()
    print()
    print("=" * 50)
    print("Tests completed!")

if __name__ == "__main__":
    main() 