/**
 * cameraHelper.ts
 * Cross-platform camera stream utility for WebRTC / getUserMedia.
 * Ensures compatibility across desktop browsers, iOS Safari, Android Chrome,
 * and hosted deployment environments (e.g., Vercel, Netlify, Render).
 */

export interface CameraStreamResult {
  stream: MediaStream;
  usedFallback: boolean;
}

export function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';
}

export function isSecureConnection(): boolean {
  if (typeof window === 'undefined') return true;
  // Localhost is always considered a secure context
  const isLocal = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]';
  return isLocal || window.isSecureContext || window.location.protocol === 'https:';
}

/**
 * Request camera access with progressive fallback strategy:
 * 1. Ideal HD constraints (facingMode: 'user', width/height ideal)
 * 2. Basic user-facing constraints
 * 3. Minimal video constraint ({ video: true })
 */
export async function getCameraStream(preferredResolution: { width?: number; height?: number } = { width: 1280, height: 720 }): Promise<MediaStream> {
  if (!isSecureConnection()) {
    throw new Error('Camera access requires HTTPS. In deployment, make sure you are accessing via https:// rather than http://.');
  }

  if (!isCameraSupported()) {
    throw new Error('Your browser does not support camera access (navigator.mediaDevices.getUserMedia is unavailable). Try Chrome, Edge, Safari, or Firefox.');
  }

  // Strategy 1: Ideal resolution + facingMode
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: preferredResolution.width || 1280 },
        height: { ideal: preferredResolution.height || 720 },
      },
      audio: false,
    });
  } catch (err1: any) {
    console.warn('[CameraHelper] Strategy 1 failed, trying basic user-facing constraint...', err1?.name || err1);
  }

  // Strategy 2: Just facingMode 'user'
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
  } catch (err2: any) {
    console.warn('[CameraHelper] Strategy 2 failed, falling back to minimal video constraint...', err2?.name || err2);
  }

  // Strategy 3: Minimal fallback { video: true }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  } catch (err3: any) {
    console.error('[CameraHelper] All camera strategies failed', err3);
    throw err3;
  }
}

/**
 * Attach stream to an HTMLVideoElement and ensure playback begins reliably across all mobile & desktop browsers.
 */
export async function attachStreamToVideo(
  videoElement: HTMLVideoElement | null,
  stream: MediaStream
): Promise<void> {
  if (!videoElement) return;

  videoElement.srcObject = stream;
  videoElement.setAttribute('playsinline', 'true');
  videoElement.setAttribute('webkit-playsinline', 'true');
  videoElement.muted = true;
  videoElement.volume = 0;

  return new Promise<void>((resolve) => {
    const startPlay = async () => {
      try {
        await videoElement.play();
      } catch (err) {
        console.warn('[CameraHelper] Autoplay error, will retry on user interaction:', err);
      }
      resolve();
    };

    if (videoElement.readyState >= 2) {
      startPlay();
    } else {
      videoElement.onloadedmetadata = () => {
        startPlay();
      };
      // Fallback timeout in case onloadedmetadata doesn't fire
      setTimeout(() => {
        startPlay();
      }, 300);
    }
  });
}

/**
 * Format browser camera errors into friendly, actionable user instructions.
 */
export function getCameraErrorMessage(err: any): string {
  if (!err) return 'Camera failed to start. Please check your camera permissions.';

  const errorName = err.name || '';
  const errorMsg = err.message || '';

  if (!isSecureConnection()) {
    return 'Camera access requires HTTPS. In deployment, please ensure your URL starts with https://';
  }

  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorMsg.includes('Permission denied')) {
    return 'Camera permission was blocked. In your browser address bar, click the camera / padlock icon and change Camera to "Allow", then refresh the page.';
  }

  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
    return 'No camera hardware found on this device. Please connect a webcam or enable your device camera.';
  }

  if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
    return 'Camera is already in use by another app or browser tab (e.g. Zoom, Teams, Meet). Please close other camera apps and click Turn On Camera.';
  }

  if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
    return 'Your camera does not support the requested video resolution. Retrying with basic settings...';
  }

  if (errorName === 'SecurityError') {
    return 'Camera access was blocked by browser security policy. Make sure permissions are granted and not running in a restricted iframe.';
  }

  return errorMsg || 'Unable to access camera. Please allow camera permissions and try again.';
}
