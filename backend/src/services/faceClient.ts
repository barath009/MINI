import axios from 'axios';
import { config } from '../config';

export interface FaceRecognitionResult {
  matched: boolean;
  studentId?: string;
  registerNumber?: string;
  confidence: number;
  faceDetected: boolean;
  faceCount: number;
  qualityScore: number;
  livenessPassed: boolean;
  modelVersion: string;
  processingTimeMs: number;
  reason?: string;
}

export class FaceClient {
  public static async recognizeFace(imagePayload: {
    image?: string;
    imagePath?: string;
    mockRegisterNumber?: string;
  }): Promise<FaceRecognitionResult> {
    // Development / Mock mode handling for immediate test execution
    if (config.faceRecognitionMode === 'mock') {
      if (imagePayload.mockRegisterNumber === 'UNKNOWN') {
        return {
          matched: false,
          confidence: 0.35,
          faceDetected: true,
          faceCount: 1,
          qualityScore: 0.90,
          livenessPassed: true,
          modelVersion: 'ArcFace-Mock-v1',
          processingTimeMs: 45,
          reason: 'No enrolled student match found',
        };
      }
      if (imagePayload.mockRegisterNumber === 'NO_FACE') {
        return {
          matched: false,
          confidence: 0.0,
          faceDetected: false,
          faceCount: 0,
          qualityScore: 0.0,
          livenessPassed: false,
          modelVersion: 'ArcFace-Mock-v1',
          processingTimeMs: 12,
          reason: 'No human face detected in frame',
        };
      }
      if (imagePayload.mockRegisterNumber === 'SPOOF') {
        return {
          matched: true,
          registerNumber: '7376221CS101',
          confidence: 0.88,
          faceDetected: true,
          faceCount: 1,
          qualityScore: 0.85,
          livenessPassed: false,
          modelVersion: 'ArcFace-Mock-v1',
          processingTimeMs: 50,
          reason: 'Liveness anti-spoofing test failed (printed photo/screen photo detected)',
        };
      }

      // Default mock success with register number if provided or default Aarav Sharma
      const regNo = imagePayload.mockRegisterNumber || '7376221CS101';
      return {
        matched: true,
        registerNumber: regNo,
        confidence: 0.94,
        faceDetected: true,
        faceCount: 1,
        qualityScore: 0.96,
        livenessPassed: true,
        modelVersion: 'ArcFace-Mock-v1',
        processingTimeMs: 62,
      };
    }

    // Real production Python FastAPI call
    try {
      const response = await axios.post<FaceRecognitionResult>(
        `${config.faceServiceUrl}/face/recognize`,
        imagePayload,
        {
          headers: {
            'x-api-key': config.faceServiceApiKey,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[FaceClient] Failed to call face recognition microservice:', error.message);
      throw new Error(`Face recognition service unavailable: ${error.message}`);
    }
  }
}
