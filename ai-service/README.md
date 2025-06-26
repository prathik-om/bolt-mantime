# AI Timetable Generator Service

A FastAPI-based service that uses Google OR-Tools for constraint programming to generate optimal school timetables.

## Features

- **Constraint Programming**: Uses OR-Tools CP-SAT solver for optimal timetable generation
- **Flexible Constraints**: Support for teacher availability, room capacity, consecutive lessons, and more
- **Real-time Progress**: Background job processing with progress tracking
- **Solution Validation**: Comprehensive validation of generated timetables
- **RESTful API**: Clean API endpoints for integration with frontend applications

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   FastAPI        │    │   OR-Tools      │
│   (Next.js)     │◄──►│   Service        │◄──►│   CP-SAT Solver │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Job Queue      │
                       │   (In-memory)    │
                       └──────────────────┘
```

## Setup

### Prerequisites

- Python 3.11+
- Docker (optional)

### Local Development

1. **Install dependencies**:
   ```bash
   cd ai-service
   pip install -r requirements.txt
   ```

2. **Run the service**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Access the API**:
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Health check: http://localhost:8000/health

### Docker Deployment

1. **Build and run with Docker Compose**:
   ```bash
   cd ai-service
   docker-compose up --build
   ```

2. **Or build manually**:
   ```bash
   docker build -t ai-timetable-service .
   docker run -p 8000:8000 ai-timetable-service
   ```

## API Endpoints

### Generate Timetable
```http
POST /generate-timetable
Content-Type: application/json

{
  "school_config": {
    "school_id": "school_1",
    "name": "Example School",
    "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "start_time": "08:00:00",
    "end_time": "16:00:00",
    "lesson_duration_minutes": 60,
    "break_duration_minutes": 15
  },
  "teachers": [...],
  "classes": [...],
  "rooms": [...],
  "time_slots": [...],
  "constraints": [...]
}
```

### Check Job Status
```http
GET /job-status/{job_id}
```

### Health Check
```http
GET /health
```

## Data Models

### School Configuration
- Working days and hours
- Lesson and break durations
- School-specific settings

### Teachers
- Personal information
- Availability schedules
- Qualifications and preferences

### Classes
- Grade levels and subjects
- Student counts
- Required hours per subject

### Rooms
- Capacity and type
- Equipment and availability
- Room-specific constraints

### Time Slots
- Day and time ranges
- Slot types (regular, break, lunch)

### Constraints
- Teacher availability
- Room capacity
- Consecutive lessons
- Workload limits

## Constraint Types

1. **Teacher Availability**: Restrict when teachers can teach
2. **Room Capacity**: Ensure rooms can accommodate class sizes
3. **Consecutive Lessons**: Limit consecutive lessons for classes
4. **Max/Min Lessons per Day**: Control daily workload
5. **Subject Preferences**: Prioritize certain subjects at certain times

## Optimization Goals

The solver optimizes for:
- Minimizing conflicts (teacher, room, class)
- Balancing workload across teachers and classes
- Satisfying all hard constraints
- Minimizing violations of soft constraints

## Example Usage

```python
import requests

# Generate timetable
response = requests.post("http://localhost:8000/generate-timetable", json={
    "school_config": {...},
    "teachers": [...],
    "classes": [...],
    "rooms": [...],
    "time_slots": [...],
    "constraints": [...]
})

job_id = response.json()["job_id"]

# Poll for completion
while True:
    status_response = requests.get(f"http://localhost:8000/job-status/{job_id}")
    status_data = status_response.json()
    
    if status_data["status"] == "completed":
        timetable = status_data["result"]["timetable"]
        break
    elif status_data["status"] == "failed":
        raise Exception(status_data["error"])
    
    time.sleep(2)
```

## Performance

- **Small problems** (< 10 classes, 10 teachers): < 5 seconds
- **Medium problems** (10-50 classes, 10-50 teachers): 5-30 seconds
- **Large problems** (> 50 classes, > 50 teachers): 30+ seconds

## Production Considerations

1. **Job Queue**: Replace in-memory storage with Redis or database
2. **Scaling**: Use multiple worker processes
3. **Monitoring**: Add logging and metrics
4. **Caching**: Cache frequently used data
5. **Security**: Add authentication and rate limiting

## Troubleshooting

### Common Issues

1. **No feasible solution**: Relax constraints or add more resources
2. **Slow performance**: Reduce problem size or increase time limit
3. **Memory issues**: Optimize constraint model

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
uvicorn main:app --reload
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License 