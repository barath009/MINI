/**
 * WebcamEnrollmentModal.tsx
 *
 * Captures 5 face samples, extracts real 128D face descriptors using face-api.js,
 * averages them into a single embedding, and saves it to the backend BiometricProfile.
 *
 * This means when the same person stands in front of the kiosk, the cosine similarity
 * between their live descriptor and the stored one will be high (≥0.55), correctly
 * identifying them.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Camera, CheckCircle, RefreshCw, AlertCircle, Brain } from 'lucide-react';
import { api } from '../../services/api';
import { loadFaceModels, detectAndDescribe, descriptorToArray } from '../../services/faceRecognition';
import { getCameraStream, attachStreamToVideo, getCameraErrorMessage } from '../../services/cameraHelper';

interface WebcamEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSuccess: () => void;
}

const POSE_PROMPTS = [
  'Look straight at the camera.',
  'Turn slightly to the LEFT.',
  'Turn slightly to the RIGHT.',
  'Tilt your head UP slightly.',
  'Tilt your head DOWN slightly.',
];

export const WebcamEnrollmentModal: React.FC<WebcamEnrollmentModalProps> = ({
  isOpen, onClose, student, onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [descriptors, setDescriptors] = useState<number[][]>([]);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [instruction, setInstruction] = useState(POSE_PROMPTS[0]);
  const [lastCaptureThumbnail, setLastCaptureThumbnail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load face-api.js models
  useEffect(() => {
    if (!isOpen) return;
    setModelLoading(true);
    loadFaceModels()
      .then(() => { setModelsReady(true); setModelLoading(false); })
      .catch(() => { setErrorMsg('Failed to load AI models. Check /public/models/.'); setModelLoading(false); });
  }, [isOpen]);

  // Start camera when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    getCameraStream({ width: 640, height: 480 })
      .then(async (s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        await attachStreamToVideo(videoRef.current, s);
        setCameraActive(true);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[WebcamEnrollmentModal] Camera start error:', err);
        setErrorMsg(getCameraErrorMessage(err));
        setCameraActive(false);
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setCameraActive(false);
    };
  }, [isOpen]);

  const captureSample = async () => {
    if (!videoRef.current || !cameraActive || !modelsReady) {
      setErrorMsg('Camera or AI model not ready yet.');
      return;
    }
    if (descriptors.length >= 5) return;

    setCapturing(true);
    setErrorMsg('');

    try {
      // Extract face descriptor from current video frame
      const descriptor = await detectAndDescribe(videoRef.current);

      if (!descriptor) {
        setErrorMsg('No face detected in frame. Please look at the camera and try again.');
        setCapturing(false);
        return;
      }

      // Save thumbnail for visual feedback
      const canvas = document.createElement('canvas');
      canvas.width = 80; canvas.height = 60;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(videoRef.current, 0, 0, 80, 60);
      setLastCaptureThumbnail(canvas.toDataURL('image/jpeg', 0.6));

      const newDescriptors = [...descriptors, descriptorToArray(descriptor)];
      setDescriptors(newDescriptors);
      setInstruction(newDescriptors.length < 5 ? POSE_PROMPTS[newDescriptors.length] : 'All samples captured! Click Complete Enrollment.');
    } catch (e) {
      setErrorMsg('Face detection failed. Ensure good lighting and look at the camera.');
    } finally {
      setCapturing(false);
    }
  };

  const handleEnrollSubmit = async () => {
    if (!student || descriptors.length < 1) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      // Average all captured descriptors into one 128D embedding
      const avgEmbedding = Array.from({ length: 128 }, (_, i) =>
        descriptors.reduce((sum, d) => sum + d[i], 0) / descriptors.length
      );

      // Normalize the averaged embedding (L2 norm)
      const norm = Math.sqrt(avgEmbedding.reduce((s, v) => s + v * v, 0));
      const normalizedEmbedding = norm > 0 ? avgEmbedding.map((v) => v / norm) : avgEmbedding;

      await api.post('/admin/biometrics/enroll', {
        studentId: student.id || student._id,
        embedding: normalizedEmbedding,   // real 128D face embedding
        faceSamples: [],                   // not needed anymore
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Enrollment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setDescriptors([]);
    setInstruction(POSE_PROMPTS[0]);
    setLastCaptureThumbnail('');
    setErrorMsg('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Enroll Biometrics: ${student?.registerNumber || ''}`}>
      <div className="space-y-4 text-xs">
        {/* Status banner */}
        <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
          modelsReady ? 'bg-cyan-950/60 border-cyan-800/50 text-cyan-300' : 'bg-violet-950/60 border-violet-800/50 text-violet-300'
        }`}>
          {modelsReady
            ? <AlertCircle className="w-4 h-4 shrink-0 text-cyan-400" />
            : <Brain className="w-4 h-4 shrink-0 text-violet-400 animate-pulse" />
          }
          <p>{modelLoading ? 'Loading AI face detection models...' : instruction}</p>
        </div>

        {/* Video feed */}
        <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden h-52 flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />

          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-2">
              <Camera className="w-8 h-8 text-slate-500" />
              <p className="text-slate-400">Webcam not active</p>
            </div>
          )}

          {modelLoading && cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 gap-2">
              <Brain className="w-8 h-8 text-violet-400 animate-pulse" />
              <p className="text-slate-300 text-xs font-semibold">Loading AI models...</p>
            </div>
          )}

          {/* Sample counter */}
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-slate-200 font-bold text-[11px]">
            {descriptors.length} / 5 captured
          </div>

          {/* Last thumbnail */}
          {lastCaptureThumbnail && (
            <div className="absolute bottom-2 left-2 w-16 h-12 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-lg">
              <img src={lastCaptureThumbnail} alt="Last capture" className="w-full h-full object-cover transform -scale-x-100" />
            </div>
          )}
        </div>

        {/* Sample dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${
              i < descriptors.length ? 'bg-emerald-500 scale-110' : 'bg-slate-700'
            }`} />
          ))}
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={reset}
            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>

          {descriptors.length < 5 ? (
            <button
              onClick={captureSample}
              disabled={capturing || !modelsReady || !cameraActive}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 shadow-lg disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {capturing ? 'Detecting...' : `Capture Sample ${descriptors.length + 1}`}
            </button>
          ) : (
            <button
              onClick={handleEnrollSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Registering...' : 'Complete Enrollment'}
            </button>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-500">
          face-api.js extracts a 128D embedding from each pose. The average is stored securely and used for automatic recognition at the kiosk.
        </p>
      </div>
    </Modal>
  );
};
