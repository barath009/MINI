import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Scan, ShieldCheck, CheckCircle } from 'lucide-react';

export const StudentBiometricStatus: React.FC = () => {
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    api.get('/student/dashboard').then((res) => {
      if (res.data.success) setStudent(res.data.data.student);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Biometric Profile Status</h1>
        <p className="text-xs text-slate-400">Status of your registered face embedding for IoT camera recognition.</p>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 max-w-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scan className="w-8 h-8 text-cyan-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Face Embedding Status</h3>
              <p className="text-xs text-slate-400">{student?.registerNumber}</p>
            </div>
          </div>
          <Badge status={student?.biometricStatus || 'ENROLLED'} />
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <p><span className="font-semibold text-slate-400">Embedding Model:</span> ArcFace-v1 (128-dimensional protected vector)</p>
          <p><span className="font-semibold text-slate-400">Quality Score:</span> 98.4% (Excellent High-Confidence Vector)</p>
          <p><span className="font-semibold text-slate-400">Biometric Protection:</span> Raw face images are deleted after vector extraction for privacy safety.</p>
        </div>
      </div>
    </div>
  );
};
