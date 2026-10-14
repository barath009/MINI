import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

export interface SystemClockStatus {
  mode: 'REAL_TIME' | 'TEST_MODE';
  effectiveTime: string;
  realTime: string;
  isPaused: boolean;
  speedMultiplier: number;
  timezone: string;
  enabledBy?: string;
  enabledAt?: string;
}

interface SystemClockContextType {
  status: SystemClockStatus | null;
  effectiveDate: Date;
  realDate: Date;
  isTestMode: boolean;
  isPaused: boolean;
  speedMultiplier: number;
  formattedDate: string;
  formattedTime: string;
  loading: boolean;
  refreshSystemTime: () => Promise<void>;
  enableTestMode: () => Promise<void>;
  disableTestMode: () => Promise<void>;
  setTestTime: (targetTime: string | Date) => Promise<void>;
  advanceTestTime: (minutes: number) => Promise<void>;
  setPlayback: (speedMultiplier: number, isPaused?: boolean) => Promise<void>;
  resetSystemTime: () => Promise<void>;
}

const SystemClockContext = createContext<SystemClockContextType | null>(null);

export const SystemClockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const { socket } = useSocket();

  const [status, setStatus] = useState<SystemClockStatus | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [realDate, setRealDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);

  // Sync reference anchors
  const syncRef = useRef<{
    serverEffectiveMs: number;
    serverRealMs: number;
    clientReceivedMs: number;
    isPaused: boolean;
    speedMultiplier: number;
    mode: 'REAL_TIME' | 'TEST_MODE';
  }>({
    serverEffectiveMs: Date.now(),
    serverRealMs: Date.now(),
    clientReceivedMs: Date.now(),
    isPaused: false,
    speedMultiplier: 1,
    mode: 'REAL_TIME',
  });

  const applyStatus = useCallback((newStatus: SystemClockStatus) => {
    setStatus(newStatus);
    const effMs = new Date(newStatus.effectiveTime).getTime();
    const realMs = new Date(newStatus.realTime).getTime();
    const nowMs = Date.now();

    syncRef.current = {
      serverEffectiveMs: isNaN(effMs) ? nowMs : effMs,
      serverRealMs: isNaN(realMs) ? nowMs : realMs,
      clientReceivedMs: nowMs,
      isPaused: Boolean(newStatus.isPaused),
      speedMultiplier: newStatus.speedMultiplier || 1,
      mode: newStatus.mode,
    };

    setEffectiveDate(new Date(syncRef.current.serverEffectiveMs));
    setRealDate(new Date(syncRef.current.serverRealMs));
  }, []);

  const refreshSystemTime = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/system-time');
      if (res.data?.success && res.data.data) {
        applyStatus(res.data.data);
      }
    } catch (err) {
      console.error('[SystemClock] Error fetching system time:', err);
    } finally {
      setLoading(false);
    }
  }, [token, applyStatus]);

  // Initial fetch on authentication
  useEffect(() => {
    if (token) {
      refreshSystemTime();
    }
  }, [token, refreshSystemTime]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleTimeUpdate = (data: any) => {
      if (data) {
        applyStatus(data);
      }
    };

    socket.on('system_time.updated', handleTimeUpdate);
    return () => {
      socket.off('system_time.updated', handleTimeUpdate);
    };
  }, [socket, applyStatus]);

  // Local ticker every 1000ms
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMs = Date.now();
      const elapsedClientMs = nowMs - syncRef.current.clientReceivedMs;

      // Real date ticks at 1x
      const currentReal = new Date(syncRef.current.serverRealMs + elapsedClientMs);
      setRealDate(currentReal);

      // Effective date ticks depending on mode
      if (syncRef.current.mode === 'REAL_TIME') {
        setEffectiveDate(currentReal);
      } else {
        if (syncRef.current.isPaused) {
          setEffectiveDate(new Date(syncRef.current.serverEffectiveMs));
        } else {
          const effectiveElapsed = elapsedClientMs * syncRef.current.speedMultiplier;
          setEffectiveDate(new Date(syncRef.current.serverEffectiveMs + effectiveElapsed));
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Admin action helpers
  const enableTestMode = async () => {
    const res = await api.put('/admin/system-time/test-mode', { enabled: true });
    if (res.data?.data) applyStatus(res.data.data);
  };

  const disableTestMode = async () => {
    const res = await api.put('/admin/system-time/test-mode', { enabled: false });
    if (res.data?.data) applyStatus(res.data.data);
  };

  const setTestTime = async (targetTime: string | Date) => {
    const targetIso = targetTime instanceof Date ? targetTime.toISOString() : new Date(targetTime).toISOString();
    const res = await api.put('/admin/system-time/set', { targetTime: targetIso });
    if (res.data?.data) applyStatus(res.data.data);
  };

  const advanceTestTime = async (minutes: number) => {
    const res = await api.post('/admin/system-time/advance', { minutes });
    if (res.data?.data) applyStatus(res.data.data);
  };

  const setPlayback = async (speedMultiplier: number, isPaused = false) => {
    const res = await api.post('/admin/system-time/playback', { speedMultiplier, isPaused });
    if (res.data?.data) applyStatus(res.data.data);
  };

  const resetSystemTime = async () => {
    const res = await api.post('/admin/system-time/reset');
    if (res.data?.data) applyStatus(res.data.data);
  };

  // IST (Asia/Kolkata) formatting
  const formattedDate = effectiveDate.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = effectiveDate.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <SystemClockContext.Provider
      value={{
        status,
        effectiveDate,
        realDate,
        isTestMode: status?.mode === 'TEST_MODE',
        isPaused: Boolean(status?.isPaused),
        speedMultiplier: status?.speedMultiplier || 1,
        formattedDate,
        formattedTime,
        loading,
        refreshSystemTime,
        enableTestMode,
        disableTestMode,
        setTestTime,
        advanceTestTime,
        setPlayback,
        resetSystemTime,
      }}
    >
      {children}
    </SystemClockContext.Provider>
  );
};

export const useSystemClock = () => {
  const context = useContext(SystemClockContext);
  if (!context) {
    throw new Error('useSystemClock must be used within a SystemClockProvider');
  }
  return context;
};
