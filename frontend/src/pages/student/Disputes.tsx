import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatErrorMessage } from '../../utils/errorUtils';
import {
  HelpCircle,
  Plus,
  Send,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileQuestion,
  User,
} from 'lucide-react';

const ISSUE_CATEGORIES = [
  'Biometric attendance missing',
  'Incorrect attendance status',
  'Incorrect recorded time',
  'Other attendance issue',
];

export const StudentDisputes: React.FC = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    attendanceId: '',
    attendanceDate: new Date().toISOString().split('T')[0],
    issueCategory: 'Incorrect attendance status',
    description: '',
    evidenceReference: '',
  });

  const fetchIssuesAndRecords = async () => {
    try {
      setLoading(true);
      const [iRes, rRes] = await Promise.all([
        api.get('/student/attendance-issues'),
        api.get('/student/attendance?limit=30'),
      ]);
      if (iRes.data.success) setIssues(iRes.data.data);
      if (rRes.data.success) setRecentRecords(rRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuesAndRecords();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || formData.description.trim().length < 10) {
      setErrorMsg('Please provide a detailed description (at least 10 characters) explaining the issue.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);
    try {
      const payload: any = {
        issueCategory: formData.issueCategory,
        description: formData.description.trim(),
        evidenceReference: formData.evidenceReference?.trim(),
      };
      if (formData.attendanceId) payload.attendanceId = formData.attendanceId;
      if (formData.attendanceDate) payload.attendanceDate = formData.attendanceDate;

      const res = await api.post('/student/attendance-issues', payload);
      if (res.data.success) {
        setShowAddModal(false);
        setFormData({
          attendanceId: '',
          attendanceDate: new Date().toISOString().split('T')[0],
          issueCategory: 'Incorrect attendance status',
          description: '',
          evidenceReference: '',
        });
        setSuccessMsg('Attendance issue submitted successfully. Assigned faculty will review it.');
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchIssuesAndRecords();
      }
    } catch (err: any) {
      setErrorMsg(formatErrorMessage(err, 'Failed to submit attendance issue request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono">
            STUDENT PORTAL
          </span>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Report Attendance Issue</h1>
          <p className="text-xs text-slate-400">
            Submit a formal dispute if biometric attendance was missing, timed incorrectly, or wrongly marked.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowAddModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Report New Issue
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Issues Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 font-bold text-xs text-slate-200 uppercase tracking-wider font-mono flex items-center justify-between">
          <span>Submitted Attendance Requests</span>
          <span className="text-slate-500 font-normal">({issues.length} Total)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Issue Category</th>
                <th className="py-3 px-4">Subject &amp; Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Faculty Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    Loading your submitted issues...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No attendance issues currently reported.
                  </td>
                </tr>
              ) : (
                issues.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{i.requestId}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {i.issueCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {i.attendanceDetails ? (
                        <div>
                          <span className="font-bold text-slate-100 block">{i.attendanceDetails.subjectName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {i.attendanceDetails.date} ({i.attendanceDetails.status})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-300" title={i.description}>
                      {i.description}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{i.submittedAt}</td>
                    <td className="py-3 px-4">
                      <Badge status={i.status === 'APPROVED' ? 'SAFE' : i.status === 'REJECTED' ? 'CRITICAL' : 'WARNING'} text={i.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {i.reviewRemark ? (
                        <div>
                          <span className="text-slate-200 block font-semibold">{i.reviewRemark}</span>
                          <span className="text-[10px] text-slate-500">By {i.reviewedBy || 'Faculty'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Pending review</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Report Attendance Issue Form */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Submit Attendance Issue Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Category *</label>
            <select
              value={formData.issueCategory}
              onChange={(e) => setFormData({ ...formData, issueCategory: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              {ISSUE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Linked Session (Optional)</label>
              <select
                value={formData.attendanceId}
                onChange={(e) => setFormData({ ...formData, attendanceId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">— Unlinked / Missing Record —</option>
                {recentRecords.map((r) => (
                  <option key={r.id || r._id} value={r.id || r._id}>
                    {r.subjectCode} ({r.date} - {r.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Attendance Date *</label>
              <input
                type="date"
                required
                value={formData.attendanceDate}
                onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Description *</label>
            <textarea
              rows={3}
              required
              placeholder="Explain why the attendance was not recorded properly (e.g. was present in Classroom A204 during period 2, facial scan did not buzz)..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Evidence Reference / Proof (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Medical certificate reference, lab sign-in sheet, on-duty letter..."
              value={formData.evidenceReference}
              onChange={(e) => setFormData({ ...formData, evidenceReference: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
