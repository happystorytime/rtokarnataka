import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Car,
  Users,
  Plus,
  Trash2,
  X,
  ChevronRight
} from 'lucide-react';
import { Reminder } from '../types';
import { api } from '../api';

export const RemindersView: React.FC = () => {
  const [savedReminders, setSavedReminders] = useState<Reminder[]>([]);
  const [expiringVehicles, setExpiringVehicles] = useState<any[]>([]);
  const [dueCases, setDueCases] = useState<any[]>([]);
  const [dueFollowups, setDueFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for new custom reminder
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'custom' | 'document_expiry' | 'case_due' | 'follow_up'>('custom');
  const [saving, setSaving] = useState(false);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const data = await api.getReminders();
      setSavedReminders(data.savedReminders || []);
      setExpiringVehicles(data.expiringVehicles || []);
      setDueCases(data.dueCases || []);
      setDueFollowups(data.dueFollowups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    setSaving(true);
    try {
      await api.createReminder({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        type
      });
      setModalOpen(false);
      fetchReminders();
    } catch (err: any) {
      alert('Failed to create reminder: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (id: string) => {
    try {
      await api.updateReminderStatus(id, 'completed');
      fetchReminders();
    } catch (err: any) {
      alert('Failed to update reminder: ' + err.message);
    }
  };

  const snooze = async (id: string, days: number) => {
    try {
      await api.updateReminderStatus(id, 'snoozed', days);
      fetchReminders();
    } catch (err: any) {
      alert('Failed to snooze reminder: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" /> Reminders & Action Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Document expirations, due RTO case submissions, and scheduled client follow-ups
          </p>
        </div>

        <button
          onClick={() => {
            setTitle('');
            setDescription('');
            setDueDate(new Date().toISOString().split('T')[0]);
            setType('custom');
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Custom Reminder
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Due & Overdue RTO Cases */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-rose-400" />
                Due & Overdue RTO Cases ({dueCases.length})
              </h2>
              <span className="text-[11px] text-slate-500">Scheduled paperwork due for RTO submission</span>
            </div>

            {dueCases.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">
                No RTO cases currently due or overdue.
              </p>
            ) : (
              <div className="space-y-2">
                {dueCases.map((c) => {
                  const isOverdue = new Date(c.due_date) < new Date();
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                        isOverdue
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{c.case_number}</span>
                          <span className="text-slate-400">({c.service_type.replace(/_/g, ' ')})</span>
                          {isOverdue && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Client: {c.client_name} ({c.client_mobile}) {c.vehicle_reg && `• Vehicle: ${c.vehicle_reg}`}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-xs block">Due: {c.due_date}</span>
                        <span className="text-[10px] text-slate-400 uppercase">Status: {c.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Expiring Vehicle Documents */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-400" />
                Vehicle Insurance & Fitness Expiring Within 30 Days ({expiringVehicles.length})
              </h2>
            </div>

            {expiringVehicles.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">
                No vehicle insurance or fitness certs expiring in the next 30 days.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {expiringVehicles.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-300">{v.reg_number}</span>
                      <span className="text-slate-400">{v.make} {v.model}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Owner: {v.client_name || 'Unassigned'} ({v.client_mobile || 'N/A'})
                    </p>

                    <div className="flex flex-col gap-1 pt-1 text-[11px]">
                      {v.insurance_expiry && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Insurance Expiry:</span>
                          <span className="font-bold text-rose-400">{v.insurance_expiry}</span>
                        </div>
                      )}
                      {v.fitness_valid_upto && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Fitness Validity:</span>
                          <span className="font-bold text-amber-400">{v.fitness_valid_upto}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Client Follow-ups */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Client Follow-ups Due ({dueFollowups.length})
              </h2>
            </div>

            {dueFollowups.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">
                No client follow-ups due.
              </p>
            ) : (
              <div className="space-y-2">
                {dueFollowups.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{c.full_name}</span>
                      <span className="text-slate-400 ml-2">({c.mobile})</span>
                      {c.follow_up_notes && (
                        <p className="text-[11px] text-slate-300 mt-0.5">{c.follow_up_notes}</p>
                      )}
                    </div>
                    <span className="font-semibold text-emerald-400 text-xs">
                      Due: {c.follow_up_date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Custom Owner Reminders */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Custom Task Reminders ({savedReminders.length})
              </h2>
            </div>

            {savedReminders.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">
                No custom reminders created. Click "+ Add Custom Reminder" to create tasks.
              </p>
            ) : (
              <div className="space-y-2">
                {savedReminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">{rem.title}</p>
                      {rem.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{rem.description}</p>
                      )}
                      <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Due Date: {rem.due_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <button
                        onClick={() => snooze(rem.id, 3)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                        title="Snooze 3 days"
                      >
                        Snooze 3d
                      </button>
                      <button
                        onClick={() => markComplete(rem.id)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        title="Mark Completed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Reminder Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                Add Custom Reminder
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Visit KA-01 Koramangala for biometric"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details or phone contact..."
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/20"
                >
                  {saving ? 'Saving...' : 'Set Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
