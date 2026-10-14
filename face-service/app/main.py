from fastapi import FastAPI, HTTPException, Header, Body
from pydantic import BaseModel
from typing import Optional
import time

from app.config import settings
from app.services.face_engine import face_engine
from app.services.liveness_engine import LivenessEngine

app = FastAPI(
    title="BIT Smart Attendance - Face Recognition Microservice",
    description="Python FastAPI service handling face detection, embedding extraction, and anti-spoofing liveness verification.",
    version="1.0.0"
)

class RecognizeRequest(BaseModel):
    image: Optional[str] = None
    imagePath: Optional[str] = None
    mockStudentRegisterNumber: Optional[str] = None
    mockRegisterNumber: Optional[str] = None

class EnrollRequest(BaseModel):
    studentId: str
    registerNumber: str
    images: list[str]

@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "Python Face Recognition Service",
        "mode": settings.FACE_RECOGNITION_MODE,
        "modelVersion": settings.MODEL_VERSION,
        "timestamp": time.time()
    }

@app.post("/face/detect")
def detect_face(payload: RecognizeRequest):
    img = face_engine.decode_base64_image(payload.image) if payload.image else None
    count, faces = face_engine.detect_faces(img)
    return {
        "faceDetected": count > 0,
        "faceCount": count,
        "faces": [
            {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
            for (x, y, w, h) in faces
        ] if count > 0 else []
    }

@app.post("/face/enroll")
def enroll_face(payload: EnrollRequest):
    embeddings = []
    for img_str in payload.images[:5]:
        img = face_engine.decode_base64_image(img_str)
        emb = face_engine.generate_embedding(img)
        embeddings.append(emb)

    mean_embedding = [float(x) for x in (sum(embeddings[i][j] for i in range(len(embeddings))) / len(embeddings) for j in range(128))] if embeddings else [0.0]*128

    return {
        "success": True,
        "studentId": payload.studentId,
        "registerNumber": payload.registerNumber,
        "embedding": mean_embedding,
        "qualityScore": 0.98,
        "modelVersion": settings.MODEL_VERSION
    }

@app.post("/face/recognize")
def recognize_face(payload: RecognizeRequest, x_api_key: Optional[str] = Header(None)):
    result = face_engine.process_recognition(payload.model_dump())
    return result

@app.post("/face/liveness")
def verify_liveness(payload: RecognizeRequest):
    img = face_engine.decode_base64_image(payload.image) if payload.image else None
    passed, score = LivenessEngine.check_liveness(img)
    return {
        "livenessPassed": passed,
        "livenessScore": score,
        "threshold": settings.LIVENESS_THRESHOLD
    }
