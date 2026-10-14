import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorUtils';
import { Cpu, Plus, Camera, Key, Trash2, CheckCircle, ShieldCheck, Lock, Edit } from 'lucide-react';

export const AdminDevices: React.FC = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    deviceId: '',
    deviceName: '',
    deviceType: 'RASPBERRY_PI',
    classroomId: '',
    ipAddress: '',
    apiKey: '',
    status: 'ONLINE',
  });

  const fetchDevices = async () => {
    try {
      const res = await api.get('/admin/devices');
      if (res.data.success) setDevices(res.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchDevices();
    api.get('/admin/classrooms').then((res) => {
      if (res.data.success) setClassrooms(res.data.data);
    });
  }, []);

  const handleOpenAddModal = () => {
    setEditingDevice(null);
    setFormData({
      deviceId: '',
      deviceName: '',
      deviceType: 'RASPBERRY_PI',
      classroomId: classrooms[0]?._id || '',
      ipAddress: '192.168.1.105',
      apiKey: 'Device@123',
      status: 'ONLINE',
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (dev: any) => {
    setEditingDevice(dev);
    setFormData({
      deviceId: dev.deviceId || '',
      deviceName: dev.deviceName || '',
      deviceType: dev.deviceType || 'RASPBERRY_PI',
      classroomId: dev.classroomId?._id || dev.classroomId || '',
      ipAddress: dev.ipAddress || '',
      apiKey: '', // blank unless changing passcode
      status: dev.status || 'ONLINE',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingDevice) {
        const payload: any = { ...formData };
        if (!payload.apiKey) delete payload.apiKey; // don't overwrite if empty
        const res = await api.put(`/admin/devices/${editingDevice._id}`, payload);
        if (res.data.success) {
          setShowModal(false);
          setSuccessMessage(`Biometric device '${formData.deviceId}' updated successfully!`);
          setTimeout(() => setSuccessMessage(''), 4000);
          fetchDevices();
        }
      } else {
        const res = await api.post('/admin/devices', formData);
        if (res.data.success) {
          setShowModal(false);
          setSuccessMessage(`Biometric device '${formData.deviceId}' registered with custom password!`);
          setTimeout(() => setSuccessMessage(''), 4000);
          fetchDevices();
        }
      }
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Failed to save IoT device'));
    }
  };

  const handleDeleteDevice = async (id: string, devId: string) => {
    if (!window.confirm(`Are you sure you want to delete IoT Biometric Device '${devId}'?`)) return;
    try {
      await api.delete(`/admin/devices/${id}`);
      setSuccessMessage(`Biometric Device '${devId}' removed.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchDevices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete device');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            Biometric IoT Hardware &amp; Camera Devices
          </h1>
          <p className="text-xs text-slate-400">
            Manage device credentials (Device ID &amp; Password) for standalone camera biometric attendance units.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/device-login')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            Camera Device Login
          </button>
          <button
            onClick={() => navigate('/biometric-scanner')}
            className="px-3.5 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-extrabold text-xs flex items-center gap-1.5 shadow"
          >
            <Camera className="w-4 h-4 text-cyan-400 animate-pulse" />
            Launch Scanner Kiosk
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20"
          >
            <Plus className="w-4 h-4" />
            Register New IoT Device
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((d) => (
          <div key={d._id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 relative flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800/80 text-cyan-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-sm tracking-tight">{d.deviceName}</h3>
                    <p className="text-[11px] text-cyan-400 font-mono font-bold">ID: {d.deviceId}</p>
                  </div>
                </div>
                <Badge status={d.status} />
              </div>

              {/* Login Credentials Box */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Device ID:
                  </span>
                  <span className="font-bold text-cyan-300">{d.deviceId}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Passcode:
                  </span>
                  <span className="font-bold text-emerald-400">•••••••• (Configured)</span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                <p>
                  <span className="font-semibold text-slate-300">Classroom:</span>{' '}
                  {d.classroomId?.building ? `${d.classroomId?.building} - ${d.classroomId?.roomNumber}` : 'Unassigned'}
                </p>
                <p>
                  <span className="font-semibold text-slate-300">IP Address:</span> {d.ipAddress || '192.168.1.105'}
                </p>
                <p>
                  <span className="font-semibold text-slate-300">Camera Status:</span>{' '}
                  <span className={d.cameraStatus === 'OK' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {d.cameraStatus || 'OK'}
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">{d.deviceType}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEditModal(d)}
                  className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60"
                  title="Edit IoT Device"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => navigate('/device-login')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" /> Login Device
                </button>
                <button
                  onClick={() => handleDeleteDevice(d._id, d.deviceId)}
                  className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60"
                  title="Delete Device"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Register / Edit IoT Device Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingDevice ? "Edit IoT Biometric Hardware Device" : "Register IoT Biometric Hardware Unit"}>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {error && <div className="p-2.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Unique Device ID *</label>
              <input
                type="text"
                required
                placeholder="CAM_CSE_101"
                value={formData.deviceId}
                onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {editingDevice ? "New Password (Leave blank to keep existing)" : "Device Password / Passcode *"}
              </label>
              <input
                type="text"
                required={!editingDevice}
                placeholder={editingDevice ? "Enter new passcode..." : "e.g. Device@123"}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Device Display Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Room A204 Biometric Scanner Kiosk"
              value={formData.deviceName}
              onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Device Hardware Type *</label>
              <select
                value={formData.deviceType}
                onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="RASPBERRY_PI">RASPBERRY_PI</option>
                <option value="ESP32_CAM">ESP32_CAM</option>
                <option value="CUSTOM_EDGE">CUSTOM_EDGE</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Assigned Classroom *</label>
              <select
                required
                value={formData.classroomId}
                onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="">Select Classroom</option>
                {classrooms.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.building} - {c.roomNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              {editingDevice ? "Update Device" : "Register Device Credentials"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
