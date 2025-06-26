# AI Service Setup Guide

## Quick Start

### 1. Start the AI Service

```bash
cd ai-service
./start.sh
```

The service will be available at http://localhost:8000

### 2. Test the Service

```bash
cd ai-service
python test_solver.py
```

### 3. Configure Next.js

Add to your `.env.local`:

```env
AI_SERVICE_URL=http://localhost:8000
```

### 4. Use in Your App

The Next.js API route is already updated to call the AI service. Just use the timetable generation page as normal.

## API Endpoints

- `POST /generate-timetable` - Start timetable generation
- `GET /job-status/{job_id}` - Check generation progress
- `GET /health` - Service health check

## Docker Deployment

```bash
cd ai-service
docker-compose up --build
```

## Troubleshooting

1. **Service not starting**: Check Python 3.11+ is installed
2. **Import errors**: Run `pip install -r requirements.txt`
3. **Port conflicts**: Change port in `start.sh` or `docker-compose.yml`
4. **No solution found**: Relax constraints or add more resources

## Architecture

```
Next.js Frontend → Next.js API → Python FastAPI → OR-Tools Solver
```

The AI service uses Google OR-Tools for constraint programming to generate optimal timetables. 