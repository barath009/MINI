import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  History,
  Users,
  UserCheck,
  Link as LinkIcon,
  Search,
  Filter,
  Check,
  X,
  FileText,
  Scan,
  RefreshCw,
  Edit2,
  Save,
  RotateCcw,
  BookOpen,
  Building,
} from 'lucide-react';

type TabType = 'STUDENTS' | 'FACULTY' | 'ALLOCATIONS' | 'SUBJECTS' | 'EXPORT' | 'HISTORY';

export const BulkImport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = (searchParams.get('tab')?.toUpperCase() as TabType) || 'STUDENTS';
  const initialDept = searchParams.get('dept') || '';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [selectedDeptForSubject, setSelectedDeptForSubject] = useState<string>(initialDept);

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview state
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirming, setConfirming] = useState(false);

  // Inline Row Edit State for invalid rows
  const [editingRowNumber, setEditingRowNumber] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<Record<string, any>>({});
  const [savingRow, setSavingRow] = useState<boolean>(false);

  // New Department & Section Decisions State
  const [deptDecisions, setDeptDecisions] = useState<Record<string, { action: 'CREATE' | 'MAP'; targetCode: string; name: string }>>({});
  const [sectionDecisions, setSectionDecisions] = useState<Record<string, { action: 'CREATE' | 'MAP'; targetName: string }>>({});

  // Final summary state
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // History state
  const [historyJobs, setHistoryJobs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Export filters
  const [exportType, setExportType] = useState<'STUDENTS' | 'FACULTY' | 'SUBJECTS'>('STUDENTS');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportYear, setExportYear] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<string>('ACTIVE');
  const [exportDept, setExportDept] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Load departments list for department-specific workflows
    api.get('/admin/departments').then(res => {
      if (res.data?.success) {
        setDepartmentsList(res.data.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab')?.toUpperCase() as TabType;
    if (tab && ['STUDENTS', 'FACULTY', 'ALLOCATIONS', 'SUBJECTS', 'EXPORT', 'HISTORY'].includes(tab)) {
      setActiveTab(tab);
    }
    const dept = searchParams.get('dept');
    if (dept) {
      setSelectedDeptForSubject(dept);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
    // Reset preview when switching tabs
    setFile(null);
    setPreviewData(null);
    setImportSummary(null);
    setErrorMessage('');
    setSuccessMessage('');
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/import/history');
      if (res.data.success) {
        setHistoryJobs(res.data.data);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to fetch import history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (f: File) => {
    setErrorMessage('');
    setSuccessMessage('');
    setImportSummary(null);
    setPreviewData(null);

    const validExtensions = ['.xlsx', '.csv'];
    const hasValidExt = validExtensions.some(ext => f.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage('Please upload a valid .xlsx or .csv spreadsheet file.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB maximum limit.');
      return;
    }
    setFile(f);
  };

  const handleDownloadTemplate = async () => {
    try {
      let endpoint = '/import/templates/students';
      let filename = 'students_template.xlsx';
      if (activeTab === 'FACULTY') {
        endpoint = '/import/templates/faculty';
        filename = 'faculty_template.xlsx';
      } else if (activeTab === 'ALLOCATIONS') {
        endpoint = '/import/templates/allocations';
        filename = 'allocation_template.xlsx';
      } else if (activeTab === 'SUBJECTS') {
        endpoint = '/import/templates/subjects';
        filename = 'subjects_template.xlsx';
      }

      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setErrorMessage('Failed to download Excel template.');
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      let endpoint = '/import/students/preview';
      if (activeTab === 'FACULTY') endpoint = '/import/faculty/preview';
      if (activeTab === 'ALLOCATIONS') endpoint = '/import/allocations/preview';
      if (activeTab === 'SUBJECTS') {
        endpoint = '/import/subjects/preview';
        if (selectedDeptForSubject) {
          formData.append('defaultDepartmentId', selectedDeptForSubject);
        }
      }

      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setPreviewData(res.data.data);
        const missing = res.data.data.missingEntities;
        if (missing?.departments?.length > 0) {
          const initDepts: any = {};
          missing.departments.forEach((d: string) => {
            initDepts[d] = { action: 'CREATE', targetCode: d, name: d };
          });
          setDeptDecisions(initDepts);
        } else {
          setDeptDecisions({});
        }
        if (missing?.sections?.length > 0) {
          const initSecs: any = {};
          missing.sections.forEach((s: any) => {
            initSecs[s.name] = { action: 'CREATE', targetName: s.name };
          });
          setSectionDecisions(initSecs);
        } else {
          setSectionDecisions({});
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'File parsing and validation failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData?.jobId) return;
    setConfirming(true);
    setErrorMessage('');

    try {
      let endpoint = `/import/students/confirm/${previewData.jobId}`;
      if (activeTab === 'FACULTY') endpoint = `/import/faculty/confirm/${previewData.jobId}`;
      if (activeTab === 'ALLOCATIONS') endpoint = `/import/allocations/confirm/${previewData.jobId}`;
      if (activeTab === 'SUBJECTS') endpoint = `/import/subjects/confirm/${previewData.jobId}`;

      const res = await api.post(endpoint, {
        skipDuplicates: true,
        entityDecisions: {
          departments: deptDecisions,
          sections: sectionDecisions,
        },
      });
      if (res.data.success) {
        setSuccessMessage(res.data.message);
        setImportSummary(res.data.data);
        setPreviewData(null);
        setFile(null);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Import confirmation failed.');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelImport = async () => {
    if (!previewData?.jobId) {
      setPreviewData(null);
      setFile(null);
      return;
    }
    try {
      await api.post(`/import/history/${previewData.jobId}/cancel`);
    } catch {}
    setPreviewData(null);
    setFile(null);
    setSuccessMessage('Import was cancelled. No records were modified.');
  };

  // Inline Row Edit handlers
  const handleStartEditRow = (row: any) => {
    setEditingRowNumber(row.rowNumber);
    setEditingRowData({ ...row.data });
  };

  const handleCancelEditRow = () => {
    setEditingRowNumber(null);
    setEditingRowData({});
  };

  const handleSaveEditRow = async (rowNum: number) => {
    if (!previewData?.jobId) return;
    setSavingRow(true);
    setErrorMessage('');
    try {
      const res = await api.put(`/import/preview/${previewData.jobId}/row`, {
        rowNumber: rowNum,
        updatedData: editingRowData,
      });

      if (res.data.success) {
        setPreviewData((prev: any) => ({
          ...prev,
          totalRows: res.data.data.totalRows,
          validRows: res.data.data.validRows,
          invalidRows: res.data.data.invalidRows,
          duplicateRows: res.data.data.duplicateRows,
          previewRows: res.data.data.previewRows,
          missingEntities: res.data.data.missingEntities,
        }));
        setEditingRowNumber(null);
        setEditingRowData({});
        setSuccessMessage(`Row #${rowNum} successfully updated and re-validated!`);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || `Failed to update row #${rowNum}.`);
    } finally {
      setSavingRow(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setErrorMessage('');
    try {
      let endpoint = '/import/export/students';
      if (exportType === 'FACULTY') endpoint = '/import/export/faculty';
      if (exportType === 'SUBJECTS') endpoint = '/import/export/subjects';

      const params = new URLSearchParams();
      params.append('format', exportFormat);
      if (exportType === 'STUDENTS') {
        if (exportYear) params.append('year', exportYear);
        if (exportStatus) params.append('status', exportStatus);
      } else if (exportType === 'SUBJECTS') {
        if (exportDept) params.append('departmentId', exportDept);
      }

      const res = await api.get(`${endpoint}?${params.toString()}`, { responseType: 'blob' });
      const filename = `${exportType.toLowerCase()}_export_${Date.now()}.${exportFormat}`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccessMessage(`Successfully exported ${exportType.toLowerCase()} data.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadErrorReport = async (jobId: string) => {
    try {
      const res = await api.get(`/import/history/${jobId}/errors`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `import_errors_${jobId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setErrorMessage('Failed to download error report.');
    }
  };

  // Filter preview rows
  const visiblePreviewRows = (previewData?.previewRows || []).filter((r: any) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const dataStr = Object.values(r.data || {}).join(' ').toLowerCase();
    return dataStr.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
            Bulk Excel Import &amp; Export Center
          </h1>
          <p className="text-xs text-slate-400">
            Strict Admin-Only: Safely provision accounts, register student/faculty batches, and export records with full audit logging.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'STUDENTS'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Import Students
        </button>
        <button
          onClick={() => setActiveTab('FACULTY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'FACULTY'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Import Faculty
        </button>
        <button
          onClick={() => setActiveTab('ALLOCATIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'ALLOCATIONS'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          Import Allocations
        </button>
        <button
          onClick={() => setActiveTab('SUBJECTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'SUBJECTS'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Import Subjects
        </button>
        <button
          onClick={() => setActiveTab('EXPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'EXPORT'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'HISTORY'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Import History
        </button>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TAB 1, 2, 3: UPLOAD WORKFLOW */}
      {activeTab !== 'EXPORT' && activeTab !== 'HISTORY' && (
        <div className="space-y-6">
          {/* Step 1 & 2: Template & Upload Container */}
          {!previewData && !importSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Template Card */}
              <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Download className="w-4 h-4" />
                  Step 1: Download Standard Template
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Always use the approved institution template. Includes verified columns, stable IDs, sample rows, and an Instructions worksheet.
                </p>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-200">
                    Template:{' '}
                    {activeTab === 'STUDENTS'
                      ? 'students_template.xlsx'
                      : activeTab === 'FACULTY'
                      ? 'faculty_template.xlsx'
                      : activeTab === 'ALLOCATIONS'
                      ? 'allocation_template.xlsx'
                      : 'subjects_template.xlsx'}
                  </p>
                  <p className="text-slate-400">
                    {activeTab === 'SUBJECTS'
                      ? 'Standard fields: subject_code, subject_name, department_code, semester (1-8), credits.'
                      : 'Preserves leading zeros on register numbers and phone numbers.'}
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Excel Template (.xlsx)
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div className="md:col-span-2 glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Upload className="w-4 h-4" />
                  Step 2: Upload Completed Spreadsheet
                </div>

                {activeTab === 'SUBJECTS' && (
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-cyan-400" />
                        Target Engineering Department (Optional Fallback):
                      </span>
                      {selectedDeptForSubject && (
                        <button
                          type="button"
                          onClick={() => setSelectedDeptForSubject('')}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-normal"
                        >
                          Clear Selection
                        </button>
                      )}
                    </label>
                    <select
                      value={selectedDeptForSubject}
                      onChange={e => setSelectedDeptForSubject(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- All Departments (Specified per row in spreadsheet) --</option>
                      {departmentsList.map(dept => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400">
                      If rows in the Excel file do not specify a <code>department_code</code>, they will automatically be assigned to the selected department.
                    </p>
                  </div>
                )}

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    dragActive
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : file
                      ? 'border-emerald-500 bg-emerald-950/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />

                  {file ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-100">{file.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={() => setFile(null)}
                        className="text-[11px] text-rose-400 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <X className="w-3 h-3" /> Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-10 h-10 text-slate-500 mx-auto" />
                      <div>
                        <p className="text-xs font-bold text-slate-200">Drag &amp; Drop your Excel or CSV file here</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Supports .xlsx and .csv (Max 5MB, up to 500 rows)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs inline-flex items-center gap-2"
                      >
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        Browse Files
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    disabled={!file || uploading}
                    onClick={handleUploadAndPreview}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                      !file || uploading
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Validating Spreadsheet...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Upload &amp; Generate Preview
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: PREVIEW TABLE */}
          {previewData && (
            <div className="space-y-4">
              {/* KPI Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Rows</p>
                  <p className="text-xl font-black text-slate-100 font-mono mt-0.5">{previewData.totalRows}</p>
                </div>
                <div className="glass-card p-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 text-center">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase">Valid Rows</p>
                  <p className="text-xl font-black text-emerald-300 font-mono mt-0.5">{previewData.validRows}</p>
                </div>
                <div className="glass-card p-3 rounded-xl border border-amber-900/50 bg-amber-950/20 text-center">
                  <p className="text-[10px] text-amber-400 font-bold uppercase">Duplicates</p>
                  <p className="text-xl font-black text-amber-300 font-mono mt-0.5">{previewData.duplicateRows}</p>
                </div>
                <div className="glass-card p-3 rounded-xl border border-rose-900/50 bg-rose-950/20 text-center">
                  <p className="text-[10px] text-rose-400 font-bold uppercase">Invalid Rows</p>
                  <p className="text-xl font-black text-rose-300 font-mono mt-0.5">{previewData.invalidRows}</p>
                </div>
              </div>

              {/* Department Creation & Rename Decisions Box */}
              {previewData.missingEntities?.departments?.length > 0 && (
                <div className="glass-card p-4 rounded-2xl border border-cyan-800/80 bg-cyan-950/20 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-cyan-400" />
                    New Department(s) Detected in Uploaded File
                  </div>
                  <p className="text-xs text-slate-300">
                    The following department(s) do not currently exist in the database. Choose whether to create them, rename them, or map them to an existing department code:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {previewData.missingEntities.departments.map((dCode: string) => {
                      const cur = deptDecisions[dCode] || { action: 'CREATE', targetCode: dCode, name: dCode };
                      return (
                        <div key={dCode} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-cyan-300">File Code: {dCode}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Action:</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Target Dept Code (Rename):</label>
                              <input
                                type="text"
                                value={cur.targetCode}
                                onChange={e => {
                                  setDeptDecisions({
                                    ...deptDecisions,
                                    [dCode]: { ...cur, targetCode: e.target.value.toUpperCase() },
                                  });
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 uppercase font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Full Department Name:</label>
                              <input
                                type="text"
                                value={cur.name}
                                onChange={e => {
                                  setDeptDecisions({
                                    ...deptDecisions,
                                    [dCode]: { ...cur, name: e.target.value },
                                  });
                                }}
                                placeholder="e.g. Mechanical Eng"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-emerald-400 font-medium">
                            &check; Will create department &ldquo;{cur.targetCode}&rdquo; ({cur.name}) upon import
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section Creation & Rename Decisions Box */}
              {previewData.missingEntities?.sections?.length > 0 && (
                <div className="glass-card p-4 rounded-2xl border border-indigo-800/80 bg-indigo-950/20 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-indigo-400" />
                    New Section(s) Detected in Uploaded File
                  </div>
                  <p className="text-xs text-slate-300">
                    The following sections do not exist yet in their respective departments. You can review and rename them before import:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {previewData.missingEntities.sections.map((s: { name: string; deptCode: string }) => {
                      const cur = sectionDecisions[s.name] || { action: 'CREATE', targetName: s.name };
                      return (
                        <div key={s.name} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-indigo-300">Section: {s.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Dept: {s.deptCode}</span>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Section Name (Rename if desired):</label>
                            <input
                              type="text"
                              value={cur.targetName}
                              onChange={e => {
                                setSectionDecisions({
                                  ...sectionDecisions,
                                  [s.name]: { ...cur, targetName: e.target.value.toUpperCase() },
                                });
                              }}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 uppercase font-mono"
                            />
                          </div>
                          <p className="text-[10px] text-emerald-400 font-medium">
                            &check; Will create section &ldquo;{cur.targetName}&rdquo; under {s.deptCode}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-card p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search preview rows..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">All Statuses ({previewData.totalRows})</option>
                    <option value="VALID">Valid ({previewData.validRows})</option>
                    <option value="DUPLICATE">Duplicates ({previewData.duplicateRows})</option>
                    <option value="INVALID">Invalid ({previewData.invalidRows})</option>
                  </select>

                  <button
                    onClick={handleCancelImport}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>

                  <button
                    disabled={confirming || previewData.validRows === 0}
                    onClick={handleConfirmImport}
                    className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      confirming || previewData.validRows === 0
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                    }`}
                  >
                    {confirming ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Confirm &amp; Import ({previewData.validRows} Records)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Status</th>
                        {activeTab === 'STUDENTS' && (
                          <>
                            <th className="py-2.5 px-3">Student ID</th>
                            <th className="py-2.5 px-3">Register No</th>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Dept</th>
                            <th className="py-2.5 px-3">Section</th>
                          </>
                        )}
                        {activeTab === 'FACULTY' && (
                          <>
                            <th className="py-2.5 px-3">Faculty ID</th>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Dept</th>
                            <th className="py-2.5 px-3">Designation</th>
                          </>
                        )}
                        {activeTab === 'ALLOCATIONS' && (
                          <>
                            <th className="py-2.5 px-3">Student ID</th>
                            <th className="py-2.5 px-3">Faculty ID</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Section</th>
                          </>
                        )}
                        {activeTab === 'SUBJECTS' && (
                          <>
                            <th className="py-2.5 px-3">Subject Code</th>
                            <th className="py-2.5 px-3">Subject Name</th>
                            <th className="py-2.5 px-3">Department</th>
                            <th className="py-2.5 px-3">Semester</th>
                            <th className="py-2.5 px-3">Credits</th>
                          </>
                        )}
                        <th className="py-2.5 px-3">Validation Message</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {visiblePreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-500">
                            No rows match your filter.
                          </td>
                        </tr>
                      ) : (
                        visiblePreviewRows.map((r: any) => {
                          const isEditing = editingRowNumber === r.rowNumber;

                          return (
                            <tr
                              key={r.rowNumber}
                              className={`hover:bg-slate-900/40 transition-colors ${
                                isEditing
                                  ? 'bg-cyan-950/30 ring-1 ring-cyan-500/40'
                                  : r.status === 'INVALID'
                                  ? 'bg-rose-950/10'
                                  : r.status === 'DUPLICATE'
                                  ? 'bg-amber-950/10'
                                  : ''
                              }`}
                            >
                              <td className="py-2 px-3 font-mono text-slate-500">{r.rowNumber}</td>
                              <td className="py-2 px-3">
                                {r.status === 'VALID' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                    Valid
                                  </span>
                                )}
                                {r.status === 'DUPLICATE' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                                    Duplicate
                                  </span>
                                )}
                                {r.status === 'INVALID' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                                    Invalid
                                  </span>
                                )}
                              </td>

                              {activeTab === 'STUDENTS' && (
                                <>
                                  <td className="py-2 px-3 font-mono text-slate-300">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.studentId || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, studentId: e.target.value })}
                                        className="w-24 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono"
                                        placeholder="STU..."
                                      />
                                    ) : (
                                      r.data.studentId
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-cyan-400 font-semibold">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.regNum || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, regNum: e.target.value })}
                                        className="w-28 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-cyan-300 font-mono"
                                        placeholder="7376..."
                                      />
                                    ) : (
                                      r.data.regNum
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-medium text-slate-200">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.name || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, name: e.target.value })}
                                        className="w-28 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white"
                                        placeholder="Name"
                                      />
                                    ) : (
                                      r.data.name
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-slate-400 truncate max-w-[140px]">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.email || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, email: e.target.value })}
                                        className="w-36 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-slate-300"
                                        placeholder="name.dept@bitsathy.ac.in"
                                        title="Leave empty to auto-generate name.dept@bitsathy.ac.in"
                                      />
                                    ) : (
                                      r.data.email
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-300">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.deptCode || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, deptCode: e.target.value.toUpperCase() })}
                                        className="w-20 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono uppercase"
                                        placeholder="DEPT"
                                      />
                                    ) : (
                                      r.data.deptCode
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-400">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.sectionName || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, sectionName: e.target.value.toUpperCase() })}
                                        className="w-20 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono uppercase"
                                        placeholder="SEC"
                                      />
                                    ) : (
                                      r.data.sectionName
                                    )}
                                  </td>
                                </>
                              )}

                              {activeTab === 'FACULTY' && (
                                <>
                                  <td className="py-2 px-3 font-mono text-slate-300">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.facultyId || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, facultyId: e.target.value })}
                                        className="w-24 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono"
                                        placeholder="FAC..."
                                      />
                                    ) : (
                                      r.data.facultyId
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-medium text-slate-200">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.name || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, name: e.target.value })}
                                        className="w-28 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white"
                                        placeholder="Name"
                                      />
                                    ) : (
                                      r.data.name
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-slate-400 truncate max-w-[140px]">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.email || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, email: e.target.value })}
                                        className="w-36 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-slate-300"
                                        placeholder="Optional email"
                                      />
                                    ) : (
                                      r.data.email
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-300">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.deptCode || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, deptCode: e.target.value.toUpperCase() })}
                                        className="w-20 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono uppercase"
                                        placeholder="DEPT"
                                      />
                                    ) : (
                                      r.data.deptCode
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-slate-400">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.designation || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, designation: e.target.value })}
                                        className="w-28 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white"
                                        placeholder="Designation"
                                      />
                                    ) : (
                                      r.data.designation
                                    )}
                                  </td>
                                </>
                              )}

                              {activeTab === 'ALLOCATIONS' && (
                                <>
                                  <td className="py-2 px-3 font-mono text-cyan-400">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.studentId || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, studentId: e.target.value })}
                                        className="w-24 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-cyan-300 font-mono"
                                      />
                                    ) : (
                                      r.data.studentId
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-300">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.facultyId || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, facultyId: e.target.value })}
                                        className="w-24 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono"
                                      />
                                    ) : (
                                      r.data.facultyId
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-indigo-400">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.subjectCode || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, subjectCode: e.target.value.toUpperCase() })}
                                        className="w-20 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-indigo-300 font-mono uppercase"
                                      />
                                    ) : (
                                      r.data.subjectCode
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-400">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.sectionName || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, sectionName: e.target.value.toUpperCase() })}
                                        className="w-20 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono uppercase"
                                      />
                                    ) : (
                                      r.data.sectionName
                                    )}
                                  </td>
                                </>
                              )}

                              {activeTab === 'SUBJECTS' && (
                                <>
                                  <td className="py-2 px-3 font-mono font-bold text-cyan-400">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.subject_code || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, subject_code: e.target.value.toUpperCase() })}
                                        className="w-24 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono uppercase"
                                        placeholder="MZ3501"
                                      />
                                    ) : (
                                      r.data.subject_code
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-medium text-slate-200">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.subject_name || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, subject_name: e.target.value })}
                                        className="w-48 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white"
                                        placeholder="Course Title"
                                      />
                                    ) : (
                                      r.data.subject_name
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-300">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingRowData.department_code || ''}
                                        onChange={e => setEditingRowData({ ...editingRowData, department_code: e.target.value.toUpperCase() })}
                                        className="w-20 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono uppercase"
                                        placeholder="MECH"
                                      />
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]">
                                        {r.data.department_code || r.data.resolvedDeptCode || 'N/A'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-300">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min={1}
                                        max={8}
                                        value={editingRowData.semester ?? 1}
                                        onChange={e => setEditingRowData({ ...editingRowData, semester: parseInt(e.target.value, 10) || 1 })}
                                        className="w-16 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono"
                                      />
                                    ) : (
                                      `Sem ${r.data.semester}`
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-400">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={editingRowData.credits ?? 3}
                                        onChange={e => setEditingRowData({ ...editingRowData, credits: parseInt(e.target.value, 10) || 3 })}
                                        className="w-16 px-2 py-1 bg-slate-950 border border-cyan-500 rounded text-xs text-white font-mono"
                                      />
                                    ) : (
                                      `${r.data.credits || 3} cr`
                                    )}
                                  </td>
                                </>
                              )}

                              <td className="py-2 px-3 text-[11px]">
                                {r.errors && r.errors.length > 0 ? (
                                  <span className="text-rose-400">{r.errors.join('; ')}</span>
                                ) : (
                                  <span className="text-emerald-500 font-medium">Ready for import</span>
                                )}
                              </td>

                              <td className="py-2 px-3 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      disabled={savingRow}
                                      onClick={() => handleSaveEditRow(r.rowNumber)}
                                      className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] flex items-center gap-1 shadow-sm"
                                      title="Save and re-validate"
                                    >
                                      {savingRow ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                      <span>Save</span>
                                    </button>
                                    <button
                                      disabled={savingRow}
                                      onClick={handleCancelEditRow}
                                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 border border-slate-700"
                                      title="Cancel editing"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Cancel</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleStartEditRow(r)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 ml-auto transition-all ${
                                      r.status === 'INVALID' || r.status === 'DUPLICATE'
                                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                                    }`}
                                    title="Edit and correct this row inline"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>{r.status === 'INVALID' ? 'Fix Error' : 'Edit'}</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: IMPORT SUMMARY */}
          {importSummary && (
            <div className="glass-card p-6 rounded-2xl border border-emerald-900/60 bg-emerald-950/10 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Import Completed Successfully
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Total Processed</p>
                  <p className="text-lg font-black text-slate-200 font-mono">{importSummary.totalRows}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-center">
                  <p className="text-[10px] text-emerald-400 uppercase font-bold">Imported</p>
                  <p className="text-lg font-black text-emerald-300 font-mono">{importSummary.importedRows}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-950 border border-amber-800 text-center">
                  <p className="text-[10px] text-amber-400 uppercase font-bold">Duplicates Skipped</p>
                  <p className="text-lg font-black text-amber-300 font-mono">{importSummary.skippedRows}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-950 border border-rose-800 text-center">
                  <p className="text-[10px] text-rose-400 uppercase font-bold">Invalid Rows</p>
                  <p className="text-lg font-black text-rose-300 font-mono">{importSummary.invalidRows}</p>
                </div>
                {activeTab === 'STUDENTS' && (
                  <div className="p-3 rounded-xl bg-cyan-950 border border-cyan-800 text-center">
                    <p className="text-[10px] text-cyan-400 uppercase font-bold">Face Pending</p>
                    <p className="text-lg font-black text-cyan-300 font-mono">{importSummary.biometricPending || 0}</p>
                  </div>
                )}
              </div>

              {activeTab === 'STUDENTS' && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-cyan-400" />
                    <span>
                      Face Registration remains a separate security step. Students initially have status{' '}
                      <strong>PENDING</strong>.
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/admin/students')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                  >
                    Open Student Directory &rarr;
                  </button>
                </div>
              )}

              {activeTab === 'SUBJECTS' && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span>
                      Course subjects successfully imported into curriculum structure.
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/admin/subjects-by-department')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                  >
                    View Subjects by Department &rarr;
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setImportSummary(null);
                    setFile(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EXPORT DATA */}
      {activeTab === 'EXPORT' && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 max-w-2xl">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Download className="w-4 h-4" />
            Institution-Wide Data Export
          </div>

          <p className="text-xs text-slate-400">
            Export registered records to Excel (.xlsx) or CSV format. Formula injection prevention is active. Passwords, hashes, and biometric data are never exported.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Entity Type</label>
              <select
                value={exportType}
                onChange={e => setExportType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="STUDENTS">Students Directory</option>
                <option value="FACULTY">Faculty Accounts</option>
                <option value="SUBJECTS">Courses &amp; Subjects</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Export Format</label>
              <select
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">Comma-Separated (.csv)</option>
              </select>
            </div>

            {exportType === 'STUDENTS' && (
              <>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Year of Study Filter</label>
                  <select
                    value={exportYear}
                    onChange={e => setExportYear(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value="">All Years</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status Filter</label>
                  <select
                    value={exportStatus}
                    onChange={e => setExportStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value="ACTIVE">ACTIVE Only</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="">All Statuses</option>
                  </select>
                </div>
              </>
            )}

            {exportType === 'SUBJECTS' && (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department Filter</label>
                <select
                  value={exportDept}
                  onChange={e => setExportDept(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="">All Departments</option>
                  {departmentsList.map(dept => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              disabled={exporting}
              onClick={handleExport}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Export File...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Export File ({exportFormat.toUpperCase()})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: IMPORT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">Audit record of all bulk operations performed by institutional administrators.</p>
            <button
              onClick={fetchHistory}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh History
            </button>
          </div>

          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Filename</th>
                    <th className="py-2.5 px-4">Uploaded By</th>
                    <th className="py-2.5 px-4">Total</th>
                    <th className="py-2.5 px-4">Imported</th>
                    <th className="py-2.5 px-4">Skipped</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {historyJobs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        {loadingHistory ? 'Loading history...' : 'No bulk import jobs found.'}
                      </td>
                    </tr>
                  ) : (
                    historyJobs.map(job => (
                      <tr key={job._id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-200">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              job.importType === 'STUDENTS'
                                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                : job.importType === 'FACULTY'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : job.importType === 'SUBJECTS'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                            }`}
                          >
                            {job.importType}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-300 truncate max-w-[150px]">{job.uploadedFilename}</td>
                        <td className="py-2.5 px-4 text-slate-400">{job.uploadedBy?.name || 'Admin'}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-300">{job.totalRows}</td>
                        <td className="py-2.5 px-4 font-mono text-emerald-400 font-semibold">{job.importedRows}</td>
                        <td className="py-2.5 px-4 font-mono text-amber-400">{job.skippedRows}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              job.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : job.status === 'PREVIEW'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {job.invalidRows > 0 || job.duplicateRows > 0 ? (
                            <button
                              onClick={() => handleDownloadErrorReport(job._id)}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] inline-flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> Errors (.xlsx)
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[11px]">No errors</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
