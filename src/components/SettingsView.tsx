import React, { useState, useEffect } from 'react';
import {
  Settings,
  Lock,
  Download,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Clock,
  Server
} from 'lucide-react';
import { api } from '../api';

export const SettingsView: React.FC = () => {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Backup state
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupsList, setBackupsList] = useState<{ fileName: string; sizeBytes: number; createdAt: string }[]>([]);

  // System Diagnostics
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const fetchDiagnostics = async () => {
    try {
      const h = await fetch('/api/health').then((r) => r.json());
      setHealthStatus(h);
      const b = await api.listBackups();
      setBackupsList(b);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message || 'Password successfully changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      await api.exportBackup();
      fetchDiagnostics();
    } catch (err: any) {
      alert('Failed to download backup: ' + err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" /> System Settings & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Master password configuration, automated SQLite backups, and system diagnostics
        </p>
      </div>

      {/* Security Architecture Confirmation */}
      <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-white">Private Single-Owner Architecture</h3>
          <p className="mt-0.5 text-slate-300 leading-relaxed">
            This system runs without public user registration or third-party tracking. All client records, vehicle chassis
            details, and documents are stored strictly in your private local SQLite database and protected file storage.
          </p>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Database Backup & Disaster Recovery</h2>
              <p className="text-xs text-slate-400">Download a full snapshot of all RTO cases, clients, and accounting</p>
            </div>
          </div>

          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {backupLoading ? 'Generating...' : 'Export Backup (.db)'}
          </button>
        </div>

        {/* Existing Backups List */}
        <div className="pt-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Server Backup Snapshots
          </h4>
          {backupsList.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">
              No server snapshots created yet. Click "Export Backup" above to generate your first snapshot.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {backupsList.map((b) => (
                <div
                  key={b.fileName}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-slate-200">{b.fileName}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {(b.sizeBytes / 1024).toFixed(1)} KB • {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Master Administrator Password Change */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Change Master Password</h2>
            <p className="text-xs text-slate-400">Update your single-user administrator password</p>
          </div>
        </div>

        {passwordError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Current Master Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                New Master Password (Min 8 chars)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* System Health Diagnostics */}
      {healthStatus && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">System Diagnostics</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Status</span>
              <span className="font-bold text-emerald-400 uppercase">{healthStatus.status}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Database</span>
              <span className="font-bold text-sky-400 uppercase">{healthStatus.database}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Uptime</span>
              <span className="font-bold text-white">{healthStatus.uptime}s</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Framework</span>
              <span className="font-bold text-slate-300">Node / SQLite</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
