#!/usr/bin/env python3
"""
Constraint Coverage Validation Test
Tests the constraint management system to ensure proper coverage and identify issues.
"""

import requests
import json
from datetime import datetime, date
from typing import Dict, List, Any

# Configuration
AI_SERVICE_URL = "http://127.0.0.1:8000"
TEST_DATA = {
    "academic_year_id": "test-school-id",
    "term_id": "test-term-id",
    "term_start": "2024-09-01",
    "term_end": "2024-12-20",
    "constraints": [
        {
            "type": "teacher_availability",
            "description": "Respect teacher availability",
            "parameters": {},
            "weight": 1.0,
            "is_hard": True
        },
        {
            "type": "max_lessons_per_day",
            "description": "Maximum lessons per day",
            "parameters": {"max_lessons": 8},
            "weight": 1.0,
            "is_hard": True
        },
        {
            "type": "consecutive_lessons",
            "description": "Avoid consecutive lessons for same subject",
            "parameters": {"max_consecutive": 2},
            "weight": 1.0,
            "is_hard": False
        },
        {
            "type": "break_requirements",
            "description": "Respect break requirements",
            "parameters": {},
            "weight": 1.0,
            "is_hard": True
        }
    ],
    "classes": [
        {
            "id": "class-1",
            "name": "Grade 10A",
            "grade_level": "10",
            "student_count": 30,
            "subjects": [
                {"subject_id": "math-1", "hours_per_week": 5},
                {"subject_id": "science-1", "hours_per_week": 4},
                {"subject_id": "english-1", "hours_per_week": 4}
            ]
        }
    ],
    "teachers": [
        {
            "id": "teacher-1",
            "name": "John Smith",
            "email": "john.smith@example.com",
            "subjects": ["math-1"],
            "max_periods_per_day": 6,
            "max_periods_per_week": 25,
            "availability": {
                "monday": ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6", "slot-7", "slot-8"],
                "tuesday": ["slot-9", "slot-10", "slot-11", "slot-12", "slot-13", "slot-14", "slot-15", "slot-16"],
                "wednesday": ["slot-17", "slot-18", "slot-19", "slot-20", "slot-21", "slot-22", "slot-23", "slot-24"],
                "thursday": ["slot-25", "slot-26", "slot-27", "slot-28", "slot-29", "slot-30", "slot-31", "slot-32"],
                "friday": ["slot-33", "slot-34", "slot-35", "slot-36", "slot-37", "slot-38", "slot-39", "slot-40"]
            }
        },
        {
            "id": "teacher-2",
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "subjects": ["science-1"],
            "max_periods_per_day": 6,
            "max_periods_per_week": 25,
            "availability": {
                "monday": ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6", "slot-7", "slot-8"],
                "tuesday": ["slot-9", "slot-10", "slot-11", "slot-12", "slot-13", "slot-14", "slot-15", "slot-16"],
                "wednesday": ["slot-17", "slot-18", "slot-19", "slot-20", "slot-21", "slot-22", "slot-23", "slot-24"],
                "thursday": ["slot-25", "slot-26", "slot-27", "slot-28", "slot-29", "slot-30", "slot-31", "slot-32"],
                "friday": ["slot-33", "slot-34", "slot-35", "slot-36", "slot-37", "slot-38", "slot-39", "slot-40"]
            }
        },
        {
            "id": "teacher-3",
            "name": "Bob Wilson",
            "email": "bob.wilson@example.com",
            "subjects": ["english-1"],
            "max_periods_per_day": 6,
            "max_periods_per_week": 25,
            "availability": {
                "monday": ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6", "slot-7", "slot-8"],
                "tuesday": ["slot-9", "slot-10", "slot-11", "slot-12", "slot-13", "slot-14", "slot-15", "slot-16"],
                "wednesday": ["slot-17", "slot-18", "slot-19", "slot-20", "slot-21", "slot-22", "slot-23", "slot-24"],
                "thursday": ["slot-25", "slot-26", "slot-27", "slot-28", "slot-29", "slot-30", "slot-31", "slot-32"],
                "friday": ["slot-33", "slot-34", "slot-35", "slot-36", "slot-37", "slot-38", "slot-39", "slot-40"]
            }
        }
    ],
    "rooms": [
        {
            "id": "room-1",
            "name": "Classroom 101",
            "capacity": 30,
            "room_type": "classroom"
        },
        {
            "id": "room-2", 
            "name": "Science Lab 201",
            "capacity": 25,
            "room_type": "laboratory"
        },
        {
            "id": "room-3",
            "name": "Computer Lab 301", 
            "capacity": 20,
            "room_type": "computer_lab"
        }
    ],
    "time_slots": [
        {"id": "slot-1", "day": "monday", "start_time": "08:00", "end_time": "08:45", "period_number": 1},
        {"id": "slot-2", "day": "monday", "start_time": "08:45", "end_time": "09:30", "period_number": 2},
        {"id": "slot-3", "day": "monday", "start_time": "09:30", "end_time": "10:15", "period_number": 3},
        {"id": "slot-4", "day": "monday", "start_time": "10:15", "end_time": "11:00", "period_number": 4},
        {"id": "slot-5", "day": "monday", "start_time": "11:00", "end_time": "11:45", "period_number": 5},
        {"id": "slot-6", "day": "monday", "start_time": "11:45", "end_time": "12:30", "period_number": 6},
        {"id": "slot-7", "day": "monday", "start_time": "12:30", "end_time": "13:15", "period_number": 7},
        {"id": "slot-8", "day": "monday", "start_time": "13:15", "end_time": "14:00", "period_number": 8},
        {"id": "slot-9", "day": "tuesday", "start_time": "08:00", "end_time": "08:45", "period_number": 1},
        {"id": "slot-10", "day": "tuesday", "start_time": "08:45", "end_time": "09:30", "period_number": 2},
        {"id": "slot-11", "day": "tuesday", "start_time": "09:30", "end_time": "10:15", "period_number": 3},
        {"id": "slot-12", "day": "tuesday", "start_time": "10:15", "end_time": "11:00", "period_number": 4},
        {"id": "slot-13", "day": "tuesday", "start_time": "11:00", "end_time": "11:45", "period_number": 5},
        {"id": "slot-14", "day": "tuesday", "start_time": "11:45", "end_time": "12:30", "period_number": 6},
        {"id": "slot-15", "day": "tuesday", "start_time": "12:30", "end_time": "13:15", "period_number": 7},
        {"id": "slot-16", "day": "tuesday", "start_time": "13:15", "end_time": "14:00", "period_number": 8},
        {"id": "slot-17", "day": "wednesday", "start_time": "08:00", "end_time": "08:45", "period_number": 1},
        {"id": "slot-18", "day": "wednesday", "start_time": "08:45", "end_time": "09:30", "period_number": 2},
        {"id": "slot-19", "day": "wednesday", "start_time": "09:30", "end_time": "10:15", "period_number": 3},
        {"id": "slot-20", "day": "wednesday", "start_time": "10:15", "end_time": "11:00", "period_number": 4},
        {"id": "slot-21", "day": "wednesday", "start_time": "11:00", "end_time": "11:45", "period_number": 5},
        {"id": "slot-22", "day": "wednesday", "start_time": "11:45", "end_time": "12:30", "period_number": 6},
        {"id": "slot-23", "day": "wednesday", "start_time": "12:30", "end_time": "13:15", "period_number": 7},
        {"id": "slot-24", "day": "wednesday", "start_time": "13:15", "end_time": "14:00", "period_number": 8},
        {"id": "slot-25", "day": "thursday", "start_time": "08:00", "end_time": "08:45", "period_number": 1},
        {"id": "slot-26", "day": "thursday", "start_time": "08:45", "end_time": "09:30", "period_number": 2},
        {"id": "slot-27", "day": "thursday", "start_time": "09:30", "end_time": "10:15", "period_number": 3},
        {"id": "slot-28", "day": "thursday", "start_time": "10:15", "end_time": "11:00", "period_number": 4},
        {"id": "slot-29", "day": "thursday", "start_time": "11:00", "end_time": "11:45", "period_number": 5},
        {"id": "slot-30", "day": "thursday", "start_time": "11:45", "end_time": "12:30", "period_number": 6},
        {"id": "slot-31", "day": "thursday", "start_time": "12:30", "end_time": "13:15", "period_number": 7},
        {"id": "slot-32", "day": "thursday", "start_time": "13:15", "end_time": "14:00", "period_number": 8},
        {"id": "slot-33", "day": "friday", "start_time": "08:00", "end_time": "08:45", "period_number": 1},
        {"id": "slot-34", "day": "friday", "start_time": "08:45", "end_time": "09:30", "period_number": 2},
        {"id": "slot-35", "day": "friday", "start_time": "09:30", "end_time": "10:15", "period_number": 3},
        {"id": "slot-36", "day": "friday", "start_time": "10:15", "end_time": "11:00", "period_number": 4},
        {"id": "slot-37", "day": "friday", "start_time": "11:00", "end_time": "11:45", "period_number": 5},
        {"id": "slot-38", "day": "friday", "start_time": "11:45", "end_time": "12:30", "period_number": 6},
        {"id": "slot-39", "day": "friday", "start_time": "12:30", "end_time": "13:15", "period_number": 7},
        {"id": "slot-40", "day": "friday", "start_time": "13:15", "end_time": "14:00", "period_number": 8}
    ],
    "school_config": {
        "school_id": "school-1",
        "name": "Test School",
        "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "period_duration": 45,
        "sessions_per_day": 8
    },
    "holidays": [],
    "custom_holiday_weekdays": [],
    "custom_break_types": []
}

def test_ai_service_health():
    """Test if AI service is running"""
    try:
        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ AI Service is running")
            return True
        else:
            print(f"❌ AI Service health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ AI Service connection failed: {e}")
        return False

def analyze_constraint_coverage():
    """Analyze constraint coverage from test data"""
    print("\n📊 Analyzing Constraint Coverage...")
    
    # Count teachers
    total_teachers = len(TEST_DATA["teachers"])
    teachers_with_availability = sum(1 for t in TEST_DATA["teachers"] if t.get("availability"))
    
    # Count constraints
    total_constraints = len(TEST_DATA["constraints"])
    hard_constraints = sum(1 for c in TEST_DATA["constraints"] if c.get("is_hard", False))
    soft_constraints = total_constraints - hard_constraints
    
    # Count time slots
    total_time_slots = len(TEST_DATA["time_slots"])
    
    # Count classes and subjects
    total_classes = len(TEST_DATA["classes"])
    total_subjects = sum(len(c["subjects"]) for c in TEST_DATA["classes"])
    
    # Count rooms
    total_rooms = len(TEST_DATA["rooms"])
    
    print(f"📈 Coverage Statistics:")
    print(f"   • Teachers: {teachers_with_availability}/{total_teachers} have availability constraints ({teachers_with_availability/total_teachers*100:.1f}%)")
    print(f"   • Constraints: {total_constraints} total ({hard_constraints} hard, {soft_constraints} soft)")
    print(f"   • Time Slots: {total_time_slots} available")
    print(f"   • Classes: {total_classes}")
    print(f"   • Subjects: {total_subjects}")
    print(f"   • Rooms: {total_rooms}")
    
    # Check for potential issues
    issues = []
    
    if teachers_with_availability < total_teachers:
        issues.append(f"⚠️  {total_teachers - teachers_with_availability} teachers have no availability constraints")
    
    if hard_constraints == 0:
        issues.append("⚠️  No hard constraints defined")
    
    if total_time_slots < total_subjects:
        issues.append("⚠️  More subjects than available time slots")
    
    if total_rooms < total_classes:
        issues.append("⚠️  More classes than available rooms")
    
    if issues:
        print(f"\n🚨 Potential Issues:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print(f"\n✅ No obvious constraint issues detected")
    
    return {
        "total_teachers": total_teachers,
        "teachers_with_constraints": teachers_with_availability,
        "coverage_percentage": teachers_with_availability/total_teachers*100,
        "total_constraints": total_constraints,
        "hard_constraints": hard_constraints,
        "soft_constraints": soft_constraints,
        "total_rooms": total_rooms,
        "total_classes": total_classes,
        "issues": issues
    }

def test_timetable_generation():
    """Test if timetable generation works with current constraints"""
    try:
        print("\n🚀 Testing Timetable Generation...")
        
        response = requests.post(
            f"{AI_SERVICE_URL}/generate-timetable",
            json=TEST_DATA,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Timetable generation request successful")
            print(f"   • Job ID: {result.get('job_id', 'N/A')}")
            print(f"   • Status: {result.get('status', 'N/A')}")
            
            # Get job status
            job_id = result.get('job_id')
            if job_id:
                print(f"   • Checking job status...")
                status_response = requests.get(f"{AI_SERVICE_URL}/job-status/{job_id}", timeout=30)
                if status_response.status_code == 200:
                    job_status = status_response.json()
                    print(f"   • Job Status: {job_status.get('status', 'N/A')}")
                    print(f"   • Progress: {job_status.get('progress', 0)}%")
                    print(f"   • Message: {job_status.get('message', 'N/A')}")
                    
                    if job_status.get('status') == 'completed':
                        print("   ✅ Timetable generation completed successfully")
                        return True
                    elif job_status.get('status') == 'failed':
                        print(f"   ❌ Timetable generation failed: {job_status.get('error', 'Unknown error')}")
                        return False
                    else:
                        print("   ⏳ Timetable generation in progress...")
                        return None
                else:
                    print(f"   ❌ Failed to get job status: {status_response.status_code}")
                    return False
            else:
                print("   ❌ No job ID returned")
                return False
        else:
            print(f"❌ Timetable generation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Timetable generation error: {e}")
        return False

def generate_validation_report():
    """Generate a comprehensive validation report"""
    print("=" * 60)
    print("🔍 CONSTRAINT COVERAGE VALIDATION REPORT")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test 1: Service Health
    service_healthy = test_ai_service_health()
    
    if not service_healthy:
        print("\n❌ Cannot proceed with validation - AI service is not available")
        return
    
    # Test 2: Constraint Coverage Analysis
    coverage_data = analyze_constraint_coverage()
    
    # Test 3: Timetable Generation
    generation_result = test_timetable_generation()
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 VALIDATION SUMMARY")
    print("=" * 60)
    
    print(f"✅ Service Status: {'Healthy' if service_healthy else 'Unhealthy'}")
    print(f"📊 Coverage: {coverage_data['coverage_percentage']:.1f}% of teachers have constraints")
    print(f"🔧 Constraints: {coverage_data['total_constraints']} total ({coverage_data['hard_constraints']} hard)")
    print(f"🏫 Classes: {coverage_data['total_classes']}")
    print(f"🏠 Rooms: {coverage_data['total_rooms']}")
    
    if generation_result is True:
        print(f"🚀 Generation: Successful")
    elif generation_result is False:
        print(f"🚀 Generation: Failed")
    else:
        print(f"🚀 Generation: In Progress")
    
    if coverage_data['issues']:
        print(f"⚠️  Issues: {len(coverage_data['issues'])} detected")
    else:
        print(f"✅ Issues: None detected")
    
    print("\n" + "=" * 60)
    print("🎯 RECOMMENDATIONS")
    print("=" * 60)
    
    if coverage_data['coverage_percentage'] < 80:
        print("• Add more teacher availability constraints to improve coverage")
    
    if coverage_data['hard_constraints'] == 0:
        print("• Add hard constraints for critical scheduling rules")
    
    if coverage_data['total_rooms'] < coverage_data['total_classes']:
        print("• Add more rooms or reduce number of classes")
    
    if generation_result is False:
        print("• Investigate timetable generation failures")
    
    print("• Test with real school data for production validation")
    print("• Monitor constraint violations in generated timetables")
    print("• Use the /admin/constraints UI to manage constraints")

if __name__ == "__main__":
    generate_validation_report() 