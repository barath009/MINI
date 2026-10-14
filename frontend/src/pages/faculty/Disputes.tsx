import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { HelpCircle, CheckCircle, XCircle } from 'lucide-react';

export const FacultyDisputes: React.FC = () => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDisputes = async () => {
    try {
      const res = await api.get('/faculty/disputes');
      if (res.data.success) setDisputes(res.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedDispute) return;
    setLoading(true);
    try {
      const res = await api.put(`/faculty/disputes/${selectedDispute._id}`, {
        status,
        reviewRemark: reviewRemark || `Dispute ${status.toLowerCase()} by faculty.`,
      });
      if (res.data.success) {
        setSelectedDispute(null);
        setReviewRemark('');
        fetchDisputes();
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Student Attendance Dispute Reviews</h1>
        <p className="text-xs text-slate-400">Review student attendance correction requests and medical/duty leave references.</p>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Submitted Date</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Dispute Reason</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {disputes.map((d) => (
              <tr key={d._id} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 text-slate-400">{new Date(d.submittedAt).toLocaleDateString()}</td>
                <td className="py-3 px-4 font-mono font-bold text-slate-200">
                  {d.studentId?.registerNumber}
                  <span className="block text-[10px] text-slate-400 font-normal">{d.studentId?.userId?.name}</span>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-100">{d.attendanceId?.subjectId?.name || 'Subject'}</td>
                <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{d.reason}</td>
                <td className="py-3 px-4"><Badge status={d.status} /></td>
                <td className="py-3 px-4 text-right">
                  {d.status === 'PENDING' ? (
                    <button
                      onClick={() => setSelectedDispute(d)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 font-semibold text-[11px]"
                    >
                      Review Dispute
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">Reviewed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDispute && (
        <Modal isOpen={!!selectedDispute} onClose={() => setSelectedDispute(null)} title="Review Student Dispute">
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="font-bold text-slate-200">{selectedDispute.studentId?.userId?.name} ({selectedDispute.studentId?.registerNumber})</p>
              <p className="text-slate-400"><span className="font-semibold">Reason:</span> {selectedDispute.reason}</p>
              {selectedDispute.evidenceReference && (
                <p className="text-cyan-400 text-[11px]"><span className="font-semibold">Evidence Reference:</span> {selectedDispute.evidenceReference}</p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Faculty Review Remark *</label>
              <textarea
                rows={3}
                placeholder="Enter review decision notes..."
                value={reviewRemark}
                onChange={(e) => setReviewRemark(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleReview('REJECTED')}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-rose-950 border border-rose-800 text-rose-400 font-bold flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" /> Reject Dispute
              </button>
              <button
                onClick={() => handleReview('APPROVED')}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" /> Approve &amp; Update Record
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
