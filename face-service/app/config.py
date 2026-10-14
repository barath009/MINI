import os

class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    API_KEY: str = os.getenv("API_KEY", "face_service_secret_api_key_2026")
    FACE_RECOGNITION_MODE: str = os.getenv("FACE_RECOGNITION_MODE", "mock")
    RECOGNITION_THRESHOLD: float = float(os.getenv("RECOGNITION_THRESHOLD", "0.75"))
    LIVENESS_THRESHOLD: float = float(os.getenv("LIVENESS_THRESHOLD", "0.70"))
    MODEL_VERSION: str = "ArcFace-OpenCV-v1.2"

settings = Settings()
