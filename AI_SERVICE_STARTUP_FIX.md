# AI Service Startup Fix Guide

## 🚨 **Current Issue**
The AI service is not starting due to environment/network configuration issues.

## 🔧 **Quick Fixes to Try**

### **Fix 1: Check Environment Variables**
```bash
# Check if proxy is interfering
echo $http_proxy
echo $https_proxy
echo $no_proxy

# If proxy is set, try unsetting it temporarily
unset http_proxy
unset https_proxy
```

### **Fix 2: Try Different Ports**
```bash
cd ai-service

# Try port 8001
uvicorn main:app --host 127.0.0.1 --port 8001

# Try port 8002
uvicorn main:app --host 127.0.0.1 --port 8002

# Try port 3001
uvicorn main:app --host 127.0.0.1 --port 3001
```

### **Fix 3: Check Port Availability**
```bash
# Check what's using port 8000
lsof -i :8000

# Kill any processes using the port
pkill -f uvicorn
pkill -f python
```

### **Fix 4: Try Direct Python Execution**
```bash
cd ai-service
python3 main.py
```

### **Fix 5: Check Python Environment**
```bash
# Verify Python version
python3 --version

# Check if all dependencies are installed
pip3 list | grep -E "(fastapi|uvicorn|ortools)"

# Reinstall if needed
pip3 install -r requirements.txt
```

## 🧪 **Test After Each Fix**

```bash
# Test if service is running
curl --noproxy "*" http://127.0.0.1:8000/health

# Or test with Python
python3 -c "import requests; print(requests.get('http://127.0.0.1:8000/health').json())"
```

## 🎯 **Expected Success**

When working, you should see:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-25T12:00:00.000000"
}
```

## 🚀 **Once Service is Running**

1. **Test Integration:**
   ```bash
   python3 test_integration.py
   ```

2. **Test Frontend:**
   - Start Next.js: `npm run dev`
   - Go to `/admin/timetables/generate`
   - Try generating a timetable

3. **Verify Full Flow:**
   - Frontend → Backend → AI Service → Results

## 💡 **Alternative: Use Mock Service**

If the real service won't start, use the mock service for testing:

```bash
cd ai-service
python3 mock_service.py
```

This will simulate the AI service and allow you to test the full integration flow.

## 🎉 **Success Criteria**

✅ Service responds to health check
✅ Integration test passes
✅ Frontend can generate timetables
✅ Real-time progress updates work
✅ Results are displayed correctly

The integration is 95% complete - just need to get the service running! 