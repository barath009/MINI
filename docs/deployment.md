# BIT Smart Attendance System - Deployment Guide

## Docker Compose Deployment (Recommended)

1. Clone repository and set up environment:
```bash
cp .env.example .env
```

2. Build and launch all services using Docker Compose:
```bash
docker-compose up --build -d
```

Services launched:
- `mongodb` (Port 27017)
- `face-service` (Port 8000)
- `backend` (Port 5000)
- `frontend` (Port 3000)
- `iot-simulator` (Automated scenario runner)

3. Seed initial database data:
```bash
docker-compose exec backend npm run seed
```

## Local Development Deployment (Without Docker)

1. **MongoDB**: Ensure local MongoDB instance is running on `mongodb://localhost:27017`.
2. **Backend**:
```bash
cd backend
npm install
npm run seed
npm run dev
```
3. **Face Recognition Microservice**:
```bash
cd face-service
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
4. **Frontend**:
```bash
cd frontend
npm install
npm run dev
```
5. **IoT Simulator**:
```bash
cd iot-simulator
npm install
npm start
```
