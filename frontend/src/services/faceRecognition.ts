/**
 * faceRecognition.ts
 * In-browser face detection + 128D descriptor extraction using face-api.js.
 * Used by:
 *  - WebcamEnrollmentModal → generate embedding and save to backend
 *  - BiometricKioskScanner → detect face and compare embedding against stored profiles
 */
import * as faceapi from 'face-api.js';

const LOCAL_MODEL_URL = '/models';
// Reliable CDN fallback hosted on jsdelivr/github for face-api weights
const CDN_MODEL_URL = 'https://cdn.jsdelivr.net/gh/cgarciagl/face-api.js@master/weights';

let modelsLoaded = false;

/** Load all required face-api.js models with local-first and CDN fallback */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  // Try loading from local /models first
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(LOCAL_MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(LOCAL_MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('[FaceAPI] Models loaded successfully from local /models ✓');
    return;
  } catch (localErr) {
    console.warn('[FaceAPI] Local /models loading failed, falling back to CDN...', localErr);
  }

  // Fallback to CDN if local static asset serving or Vercel routing blocked shards
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(CDN_MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(CDN_MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('[FaceAPI] Models loaded successfully from CDN fallback ✓');
  } catch (cdnErr) {
    console.error('[FaceAPI] Failed to load models from both local /models and CDN fallback:', cdnErr);
    throw new Error('Could not load Face AI models from local or CDN. Check network connection.');
  }
}

/**
 * Detect a face in the given video/canvas element and return a 128D descriptor.
 * Returns null if no face is detected.
 */
export async function detectAndDescribe(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<Float32Array | null> {
  const result = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result?.descriptor ?? null;
}

/** Compute cosine similarity between two 128D vectors. Range: 0 (no match) → 1 (perfect match) */
export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < 128; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Convert Float32Array to plain number[] for JSON serialization */
export function descriptorToArray(desc: Float32Array): number[] {
  return Array.from(desc);
}

/**
 * Recognition threshold — cosine similarity must EXCEED this to count as a match.
 *
 * Observed scores for this setup:
 *   Enrolled person (same face) → above 0.97
 *   Stranger / non-enrolled     → below 0.97
 *
 * Set to 0.95 to perfectly separate enrolled vs unregistered.
 */
export const RECOGNITION_THRESHOLD = 0.97;
