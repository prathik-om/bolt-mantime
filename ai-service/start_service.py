#!/usr/bin/env python3
"""
Simple script to start the AI service and test it
"""

import uvicorn
import requests
import time
import sys

def start_service():
    """Start the AI service"""
    print("🚀 Starting AI Service...")
    
    try:
        # Start the service
        uvicorn.run(
            "main:app",
            host="127.0.0.1",
            port=8000,
            log_level="info",
            reload=False
        )
    except Exception as e:
        print(f"❌ Failed to start service: {e}")
        return False

def test_service():
    """Test if the service is working"""
    print("🧪 Testing service...")
    
    try:
        # Test health endpoint
        response = requests.get("http://127.0.0.1:8000/health", timeout=5)
        print(f"Health check status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Service is working!")
            return True
        else:
            print(f"❌ Service returned status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Service test failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Just test the service
        test_service()
    else:
        # Start the service
        start_service() 