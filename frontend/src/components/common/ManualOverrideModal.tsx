import React, { useState } from 'react';
import { Modal } from './Modal';
import { AlertTriangle, CheckSquare } from 'lucide-react';
import { api } from '../../services/api';

interface ManualOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  onSuccess: () => void;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}) => {
  const [status, setStatus] = useState<'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'>(
    record?.isVirtual ? 'PRESENT' : 'PRESENT'
  );
  const [reason, setReason] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isVirtual = !!record?.isVirtual;
  const recordId = isVirtual ? undefined : (record?.id || record?._id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setErrorMsg('Mandatory reason required (at least 5 characters).');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const body: any = { status, reason, remark };

      if (isVirtual) {
        // For absent (virtual) students: no real record yet — send studentId + sessionId in body.
        // Backend's manualAttendanceOverride will auto-create a new AttendanceRecord on the fly.
        body.studentId = record?.studentId?._id || record?.studentId;
        body.sessionId = record?.sessionId;
      }

      // Use existing override endpoint; for virtual records pass 'new' as placeholder id
      // Backend will resolve via studentId+sessionId from body when record not found by id
      const url = isVirtual
        ? `/faculty/attendance/new/override`
        : `/faculty/attendance/${recordId}/override`;

      const res = await api.put(url, body);

      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Override failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isVirtual ? 'Mark Absent Student — Manual Override (Audited)' : 'Manual Attendance Override (Audited Workflow)'}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {isVirtual && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/50 flex items-start gap-2.5 text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <p>
              This student has <strong>no attendance record yet</strong> (currently ABSENT). A new record will be created with your selected status.
            </p>
          </div>
        )}
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-start gap-2.5 text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <p>
            Manual corrections are logged permanently in the institutional Audit Log. You must specify a valid reason
            (e.g., Camera hardware glitch, Approved leave certificate).
          </p>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Target Student</label>
          <input
            type="text"
            disabled
            value={`${record?.studentId?.userId?.name || record?.studentName || 'Student'} (${record?.studentId?.registerNumber || record?.registerNumber || ''})`}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-300"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">New Attendance Status</label>
          <select
            value={status}
            onChange={(e: any) => setStatus(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="PRESENT">PRESENT</option>
            <option value="LATE">LATE</option>
            <option value="ABSENT">ABSENT</option>
            <option value="EXCUSED">EXCUSED</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Mandatory Override Reason *</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 mb-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">-- Select Standard Reason --</option>
            <option value="Camera Hardware / IoT Sensor Failure">Camera Hardware / IoT Sensor Failure</option>
            <option value="Face Recognition Low Illumination Glitch">Face Recognition Low Illumination Glitch</option>
            <option value="Official Institutional OD / Duty Leave Approved">Official Institutional OD / Duty Leave Approved</option>
            <option value="Medical Certificate Verified">Medical Certificate Verified</option>
            <option value="Network Connectivity Drop during Session">Network Connectivity Drop during Session</option>
          </select>
          <input
            type="text"
            placeholder="Or enter custom reason details..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Faculty Remarks / Notes</label>
          <textarea
            rows={2}
            placeholder="Additional notes for institutional audit..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500"
          />
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300">{errorMsg}</div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <CheckSquare className="w-4 h-4" />
            {loading ? 'Saving Override...' : 'Apply Audited Override'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
