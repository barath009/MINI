/**
 * BiometricKioskScanner.tsx
 *
 * Fully automatic face recognition kiosk using face-api.js.
 * Scans every 3.5s → sends 128D descriptor → backend cosine-similarity match.
 *
 * Three distinct states:
 *  ✅ RECOGNIZED  — student found (score ≥ 0.75) → show green card + mark attendance
 *  ❌ NOT REGISTERED — face detected but score < 0.75 → show prominent red alert
 *  👤 WAITING     — no face in frame yet
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera, CheckCircle2, ShieldCheck, RefreshCw,
  Scan, Sparkles, ArrowLeft, UserCheck, AlertCircle,
  Wifi, WifiOff, Brain, UserX, PhoneCall,
} from 'lucide-react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';
import {
  loadFaceModels,
  detectAndDescribe,
  descriptorToArray,
  RECOGNITION_THRESHOLD,
} from '../../services/faceRecognition';

interface ScanResult {
  studentName: string;
  registerNumber: string;
  department: string;
  status: string;
  confidence: number;
  timestamp: string;
}

interface RecentScan {
  studentName: string;
  registerNumber: string;
  confidence: number;
  time: string;
}

type ScanState = 'IDLE' | 'SCANNING' | 'RECOGNIZED' | 'NOT_REGISTERED' | 'NO_FACE';

const AUTO_SCAN_INTERVAL_MS = 3500;
// How long to hold the NOT_REGISTERED / RECOGNIZED result before resetting
const RESULT_DISPLAY_MS = 5000;

export const BiometricKioskScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [unknownScore, setUnknownScore] = useState<number | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [autoMode, setAutoMode] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState('');
  const [modelError, setModelError] = useState('');

  // ── Load face-api.js models ──
  useEffect(() => {
    setModelLoading(true);
    loadFaceModels()
      .then(() => { setModelsReady(true); setModelLoading(false); })
      .catch((e) => { setModelError('Failed to load AI models. Check /public/models/.'); setModelLoading(false); console.error(e); });
  }, []);

  // ── Camera ──
  const startCamera = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
      setCameraActive(true);
    } catch {
      setModelError('Unable to access webcam. Allow camera permissions and try again.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraActive(false);
  };

  /** Show a result for RESULT_DISPLAY_MS then go back to IDLE */
  const showResultThen = (state: ScanState, fn?: () => void) => {
    setScanState(state);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      setScanState('IDLE');
      setScanResult(null);
      setUnknownScore(null);
      fn?.();
    }, RESULT_DISPLAY_MS);
  };

  // ── Core recognition logic ──
  const doRecognize = useCallback(async () => {
    if (scanState === 'SCANNING' || !cameraActive || !modelsReady || !videoRef.current) return;

    setScanState('SCANNING');

    try {
      const descriptor = await detectAndDescribe(videoRef.current);

      if (!descriptor) {
        setScanState('NO_FACE');
        return;
      }

      const res = await api.post('/devices/kiosk-recognize', {
        descriptor: descriptorToArray(descriptor),
      });

      if (res.data.success && res.data.recognized !== false && res.data.data) {
        // ✅ RECOGNIZED
        const result: ScanResult = res.data.data;
        setScanResult(result);
        const t = new Date().toLocaleTimeString();
        setLastScanTime(t);
        setScanCount((c) => c + 1);
        setRecentScans((prev) => [
          { studentName: result.studentName, registerNumber: result.registerNumber, confidence: result.confidence, time: t },
          ...prev.slice(0, 4),
        ]);
        showResultThen('RECOGNIZED');
      } else if (res.data.recognized === false) {
        // ❌ NOT REGISTERED — face detected but no match above threshold
        setUnknownScore(res.data.data?.confidence ?? null);
        showResultThen('NOT_REGISTERED');
      } else if (res.data.message?.includes('biometric profiles')) {
        // No enrolled profiles at all
        setScanState('IDLE');
      }
    } catch (err: any) {
      // Network or server error — silently go back to IDLE
      setScanState('IDLE');
      console.error('[Kiosk]', err?.response?.data?.message || err);
    }
  }, [scanState, cameraActive, modelsReady]);

  // ── Auto-scan interval ──
  useEffect(() => {
    if (autoMode && cameraActive && modelsReady) {
      const t = setTimeout(() => {
        doRecognize();
        scanIntervalRef.current = setInterval(doRecognize, AUTO_SCAN_INTERVAL_MS);
      }, 2000);
      return () => {
        clearTimeout(t);
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      };
    } else {
      if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    }
  }, [autoMode, cameraActive, modelsReady, doRecognize]);

  // Cleanup
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  const ready = cameraActive && modelsReady;
  const isScanning = scanState === 'SCANNING';
  const isRecognized = scanState === 'RECOGNIZED';
  const isUnknown = scanState === 'NOT_REGISTERED';
  const isNoFace = scanState === 'NO_FACE';

  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[200px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-slate-800/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <Link to="/login" className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" /> BIT Biometric Attendance Kiosk
            </h1>
            <p className="text-[11px] text-slate-400">Real AI Face Recognition · No manual input required</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
            modelsReady ? 'bg-violet-950/80 text-violet-300 border-violet-700/60' : 'bg-slate-900 text-slate-500 border-slate-700'
          }`}>
            <Brain className="w-3.5 h-3.5" />
            {modelLoading ? 'Loading AI...' : modelsReady ? 'AI READY' : 'AI ERROR'}
          </span>
          <button
            onClick={() => setAutoMode(v => !v)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-all ${
              autoMode ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60' : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            {autoMode ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {autoMode ? 'AUTO ON' : 'AUTO OFF'}
          </button>
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono flex items-center gap-1.5 border ${
            cameraActive ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
          }`}>
            <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {cameraActive ? 'LIVE' : 'OFF'}
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 max-w-7xl mx-auto w-full items-start pt-6">
        {/* Left: Camera */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-3 rounded-3xl border border-slate-800 bg-slate-950/90 shadow-2xl">
            <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-slate-800">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />

              {/* HUD Corners */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <div className={`w-8 h-8 border-t-2 border-l-2 rounded-tl-lg transition-colors ${isUnknown ? 'border-rose-400' : isRecognized ? 'border-emerald-400' : 'border-cyan-400'}`} />
                  <div className={`w-8 h-8 border-t-2 border-r-2 rounded-tr-lg transition-colors ${isUnknown ? 'border-rose-400' : isRecognized ? 'border-emerald-400' : 'border-cyan-400'}`} />
                </div>

                {/* Face ring */}
                <div className="self-center my-auto flex flex-col items-center gap-3">
                  <div className={`w-52 h-52 sm:w-60 sm:h-60 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    isScanning   ? 'border-yellow-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
                    : isRecognized ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)] animate-pulse'
                    : isUnknown   ? 'border-rose-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                    : isNoFace   ? 'border-dashed border-slate-600'
                    : 'border-dashed border-cyan-400/70'
                  }`}>
                    {isScanning    ? <RefreshCw className="w-10 h-10 text-yellow-400 animate-spin" />
                    : isRecognized ? <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    : isUnknown   ? <UserX className="w-12 h-12 text-rose-400" />
                    : <Scan className="w-8 h-8 text-cyan-400 opacity-60" />}
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border ${
                    isScanning   ? 'bg-yellow-950/90 text-yellow-300 border-yellow-800'
                    : isRecognized ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                    : isUnknown   ? 'bg-rose-950/90 text-rose-300 border-rose-800'
                    : isNoFace   ? 'bg-slate-900/90 text-slate-500 border-slate-700'
                    : modelsReady ? 'bg-slate-950/90 text-cyan-300 border-cyan-800/60'
                    : 'bg-slate-950/90 text-slate-400 border-slate-700'
                  }`}>
                    {isScanning    ? 'ANALYZING FACE...'
                    : isRecognized ? 'IDENTITY CONFIRMED ✓'
                    : isUnknown   ? 'FACE NOT REGISTERED ✗'
                    : isNoFace   ? 'NO FACE — LOOK AT CAMERA'
                    : modelsReady ? 'LOOK AT CAMERA TO MARK ATTENDANCE'
                    : 'LOADING AI MODELS...'}
                  </span>
                </div>

                <div className="flex justify-between items-end">
                  <div className={`w-8 h-8 border-b-2 border-l-2 rounded-bl-lg ${isUnknown ? 'border-rose-400' : isRecognized ? 'border-emerald-400' : 'border-cyan-400'}`} />
                  <div className={`w-8 h-8 border-b-2 border-r-2 rounded-br-lg ${isUnknown ? 'border-rose-400' : isRecognized ? 'border-emerald-400' : 'border-cyan-400'}`} />
                </div>
              </div>

              {/* Scan sweep */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent animate-[scanSweep_1.5s_ease-in-out_infinite]" />
                </div>
              )}

              {/* Camera off */}
              {!cameraActive && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-3 z-10">
                  <Camera className="w-12 h-12 text-slate-600" />
                  <p className="text-xs text-slate-400">Camera inactive</p>
                  <button onClick={startCamera} className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs">Turn On Camera</button>
                </div>
              )}

              {/* Model loading */}
              {modelLoading && cameraActive && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3 z-10">
                  <Brain className="w-10 h-10 text-violet-400 animate-pulse" />
                  <p className="text-xs text-slate-300 font-semibold">Loading face AI models...</p>
                  <p className="text-[10px] text-slate-500">This only happens once</p>
                </div>
              )}
            </div>

            {/* Controls row */}
            <div className="pt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>face-api.js · 128D FaceNet · Threshold {(RECOGNITION_THRESHOLD * 100).toFixed(0)}%</span>
              </div>
              {!autoMode && (
                <button
                  onClick={doRecognize}
                  disabled={isScanning || !ready}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isScanning ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Scan className="w-4 h-4" /> Scan Now</>}
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Recognized', value: scanCount },
              { label: 'Last Scan', value: lastScanTime || '—' },
              { label: 'Mode', value: autoMode ? 'AUTO' : 'MANUAL' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 font-mono uppercase">{s.label}</p>
                <p className="text-sm font-bold text-cyan-300 font-mono mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Result panel */}
        <div className="lg:col-span-5 space-y-4">

          {/* ✅ RECOGNIZED */}
          {isRecognized && scanResult ? (
            <div className="p-6 rounded-3xl border-2 border-emerald-500/80 bg-emerald-950/50 space-y-4 shadow-2xl animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-mono font-bold text-[10px] uppercase tracking-wider">
                    FACE RECOGNIZED ✓
                  </span>
                  <h2 className="text-xl font-black text-slate-100 mt-0.5">{scanResult.studentName}</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs border-t border-emerald-800/50 pt-3">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] text-slate-400">REGISTER NO</p>
                  <p className="font-bold text-cyan-300">{scanResult.registerNumber}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] text-slate-400">CONFIDENCE</p>
                  <p className="font-bold text-violet-300">{scanResult.confidence ? `${(scanResult.confidence * 100).toFixed(1)}%` : '—'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] text-slate-400">DEPARTMENT</p>
                  <p className="font-bold text-slate-200 truncate">{scanResult.department}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50">
                  <p className="text-[10px] text-slate-400">STATUS</p>
                  <p className="font-extrabold text-emerald-400 text-sm">🟢 {scanResult.status}</p>
                </div>
              </div>
              <p className="text-[11px] text-emerald-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Attendance recorded automatically
              </p>
            </div>

          ) : isUnknown ? (
            /* ❌ NOT REGISTERED — Prominent alert */
            <div className="p-6 rounded-3xl border-2 border-rose-600/80 bg-rose-950/50 shadow-2xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 shrink-0 animate-pulse">
                  <UserX className="w-9 h-9" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-400/20 text-rose-300 font-mono font-bold text-[10px] uppercase tracking-wider">
                    NOT REGISTERED
                  </span>
                  <h2 className="text-xl font-black text-slate-100 mt-0.5">Face Not Recognized</h2>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-900/40 border border-rose-700/60 space-y-2">
                <p className="text-sm font-bold text-rose-200">⚠️ Your face is not enrolled in the system.</p>
                <p className="text-xs text-rose-300/80">
                  Attendance cannot be marked for unregistered faces. Please contact your administrator to enroll your biometric profile.
                </p>
                {unknownScore !== null && (
                  <p className="text-[11px] font-mono text-rose-400/70 mt-1">
                    Best match similarity: {(unknownScore * 100).toFixed(1)}% (minimum required: {(RECOGNITION_THRESHOLD * 100).toFixed(0)}%)
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-950/50 border border-amber-800/60">
                <PhoneCall className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-300">Contact Admin to Enroll</p>
                  <p className="text-[11px] text-amber-400/80 mt-0.5">
                    Ask your admin to go to <span className="font-mono bg-amber-900/60 px-1 rounded">Admin → Students → Enroll Biometrics</span> and capture your face.
                  </p>
                </div>
              </div>
            </div>

          ) : (
            /* IDLE / NO_FACE — waiting state */
            <div className="p-8 rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center gap-3 text-center">
              {isNoFace
                ? <><Camera className="w-10 h-10 text-slate-600" /><p className="text-sm font-bold text-slate-400">No face detected</p><p className="text-[11px] text-slate-500">Please look directly at the camera.</p></>
                : <><Scan className="w-10 h-10 text-slate-600" /><p className="text-sm font-bold text-slate-400">Waiting for face...</p><p className="text-[11px] text-slate-500">{modelsReady ? 'Stand in front of the camera. The AI will identify you automatically.' : 'AI models loading, please wait...'}</p></>
              }
            </div>
          )}

          {/* Model error */}
          {modelError && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {modelError}
            </div>
          )}

          {/* Recent scans log */}
          {recentScans.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Recent Attendance Log</p>
              <div className="space-y-1.5">
                {recentScans.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-slate-200">{s.studentName}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{s.registerNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-violet-400 font-mono text-[10px]">{s.confidence ? `${(s.confidence * 100).toFixed(0)}%` : ''}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{s.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-200">How it works</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                face-api.js runs entirely in your browser — it extracts a 128D face descriptor and the server matches it against enrolled profiles.
                Unregistered faces are <strong className="text-rose-400">always rejected</strong> with a clear alert.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-800/60 py-3 text-center text-[11px] text-slate-500">
        BIT Smart Attendance · Real-Time In-Browser Face Recognition · face-api.js + FaceNet 128D · Threshold {(RECOGNITION_THRESHOLD * 100).toFixed(0)}%
      </footer>

      <style>{`
        @keyframes scanSweep {
          0%   { top: 0%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-in { animation: fadeIn 0.3s ease-out; }
        .fade-in { animation-name: fadeIn; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};
