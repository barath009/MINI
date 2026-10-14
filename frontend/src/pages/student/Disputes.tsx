import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { HelpCircle, Plus, Send } from 'lucide-react';

export const StudentDisputes: React.FC = () => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ attendanceId: '', reason: '', evidenceReference: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDisputes = async () => {
    try {
      const [dRes, hRes] = await Promise.all([api.get('/student/disputes'), api.get('/student/history')]);
      if (dRes.data.success) setDisputes(dRes.data.data);
      if (hRes.data.success) setRecords(hRes.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason || formData.reason.trim().length < 10) {
      setErrorMsg('Please provide a detailed dispute reason (at least 10 characters).');
      return;
    }
    setErrorMsg('');
    try {
      const res = await api.post('/student/disputes', formData);
      if (res.data.success) {
        setShowAddModal(false);
        setFormData({ attendanceId: '', reason: '', evidenceReference: '' });
        fetchDisputes();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit dispute');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Attendance Disputes &amp; Corrections</h1>
          <p className="text-xs text-slate-400">Submit an official dispute if your attendance was incorrectly marked.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Submit New Dispute
        </button>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Submitted Date</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Reason Details</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Review Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {disputes.map((d) => (
              <tr key={d._id} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 text-slate-400">{new Date(d.submittedAt).toLocaleDateString()}</td>
                <td className="py-3 px-4 font-semibold text-slate-100">{d.attendanceId?.subjectId?.name || 'Subject'}</td>
                <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{d.reason}</td>
                <td className="py-3 px-4"><Badge status={d.status} /></td>
                <td className="py-3 px-4 text-slate-400 italic">{d.reviewRemark || 'Awaiting Faculty Review'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Submit Attendance Dispute">
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {errorMsg && <div className="p-2.5 rounded bg-rose-950 text-rose-300 border border-rose-800">{errorMsg}</div>}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Select Attendance Record *</label>
            <select
              required
              value={formData.attendanceId}
              onChange={(e) => setFormData({ ...formData, attendanceId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            >
              <option value="">Select Record</option>
              {records.map((r) => (
                <option key={r.id || r._id} value={r.id || r._id}>
                  {r.date} - {r.subjectName} ({r.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Dispute Reason &amp; Explanation *</label>
            <textarea
              required
              rows={3}
              placeholder="Explain why your attendance was incorrectly marked (e.g., Present in classroom A204 but camera failed to recognize)..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Evidence Reference (OD / Leave Ref #)</label>
            <input
              type="text"
              placeholder="e.g. OD_REF_2026_8819"
              value={formData.evidenceReference}
              onChange={(e) => setFormData({ ...formData, evidenceReference: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Submit Dispute
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
