# BIT Smart Attendance System - Face Recognition & Anti-Spoofing

## Pipeline Overview

1. **Camera Frame Decoding**: Ingests Base64 image or camera feed buffer.
2. **Face Detection**: Uses OpenCV Haar Cascade / DNN detector to locate face bounding box and count faces.
   - Rejects frame if `faceCount == 0` (`FACE_NOT_DETECTED`).
   - Rejects frame if `faceCount > 1` (`MULTIPLE_FACES`).
3. **Quality & Texture Analysis**: Calculates image Laplacian variance for sharpness check and color space distribution check (HSV/YCbCr variance).
4. **Anti-Spoofing Liveness Verification**: Evaluates texture and glare dynamics to reject photo prints, phone screens, and video replays (`LIVENESS_FAILED`).
5. **Vector Embedding Extraction**: Normalizes cropped face bounding box and computes 128-dimensional embedding vector (`ArcFace-v1`).
6. **Similarity Matching**: Computes cosine similarity distance against enrolled student vectors.
   - Rejects match if confidence score < `RECOGNITION_THRESHOLD` (Default: 0.75 / `LOW_CONFIDENCE`).
   - Rejects match if no registered student matches (`UNKNOWN_FACE`).

## Operating Modes

- **Real Mode (`FACE_RECOGNITION_MODE=real`)**: Executes live OpenCV detection, embedding comparison, and liveness scoring.
- **Mock Mode (`FACE_RECOGNITION_MODE=mock`)**: Provides development fixtures for offline testing (`7376221CS101`, `UNKNOWN`, `NO_FACE`, `SPOOF`).
