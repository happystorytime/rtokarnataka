import React, { useState } from 'react';
import {
  Users,
  Car,
  Building2,
  FolderOpen,
  Calendar,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Plus,
  Search,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  PhoneCall
} from 'lucide-react';
import { DashboardStats, formatINR } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
  openQuickAction: (action: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onNavigate,
  openQuickAction
}) => {
  const [activitySearch, setActivitySearch] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading paperwork dashboard...</p>
        </div>
      </div>
    );
  }

  const s = stats || {
    totalClients: 0,
    totalVehicles: 0,
    totalShowrooms: 0,
    openCases: 0,
    casesDueToday: 0,
    casesOverdue: 0,
    expiringDocumentsCount: 0,
    outstandingBalance: 0,
    paymentsThisMonth: 0,
    recentActivity: []
  };

  const filteredActivity = (s.recentActivity || []).filter((act) =>
    activitySearch ? act.description.toLowerCase().includes(activitySearch.toLowerCase()) : true
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30">
                Karnataka RTO Desk
              </span>
              <span className="text-xs text-slate-400">• Single-Owner Paperwork System</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Operational Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Track vehicle registrations, ownership transfers, bank clearances, and showroom paperwork across Karnataka RTOs.
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openQuickAction('new_case')}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New RTO Case
            </button>
            <button
              onClick={() => openQuickAction('new_client')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" /> Client
            </button>
            <button
              onClick={() => openQuickAction('new_vehicle')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" /> Vehicle
            </button>
            <button
              onClick={() => openQuickAction('upload_doc')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-purple-400" /> Upload Doc
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alert Bar (if overdue or expiring) */}
      {(s.casesOverdue > 0 || s.casesDueToday > 0 || s.expiringDocumentsCount > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-white">Attention required: </span>
              {s.casesOverdue > 0 && <span className="text-rose-400 font-bold">{s.casesOverdue} overdue cases, </span>}
              {s.casesDueToday > 0 && <span>{s.casesDueToday} cases due today, </span>}
              {s.expiringDocumentsCount > 0 && <span>{s.expiringDocumentsCount} documents expiring soon.</span>}
            </div>
          </div>
          <button
            onClick={() => onNavigate('reminders')}
            className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer self-start sm:self-auto"
          >
            Review Reminders <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Clients */}
        <div
          onClick={() => onNavigate('clients')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Clients</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{s.totalClients}</div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            Active owner records
          </p>
        </div>

        {/* Total Vehicles */}
        <div
          onClick={() => onNavigate('vehicles')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Vehicles</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{s.totalVehicles}</div>
          <p className="text-[11px] text-slate-400 mt-1">New, used, tractors & exchange</p>
        </div>

        {/* Total Showrooms */}
        <div
          onClick={() => onNavigate('showrooms')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Showrooms</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{s.totalShowrooms}</div>
          <p className="text-[11px] text-slate-400 mt-1">Dealer tie-ups & branches</p>
        </div>

        {/* Open RTO Cases */}
        <div
          onClick={() => onNavigate('cases')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Open RTO Cases</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{s.openCases}</div>
          <p className="text-[11px] text-slate-400 mt-1">In-progress RTO paperwork</p>
        </div>

        {/* Cases Due Today / Overdue */}
        <div
          onClick={() => onNavigate('cases')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Due Today / Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {s.casesDueToday} <span className="text-rose-400 text-lg">/ {s.casesOverdue}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Urgent RTO submissions</p>
        </div>

        {/* Documents Expiring Soon */}
        <div
          onClick={() => onNavigate('documents')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Expiring Documents</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{s.expiringDocumentsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Insurance & fitness &lt;30 days</p>
        </div>

        {/* Outstanding Balances */}
        <div
          onClick={() => onNavigate('payments')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 tracking-tight">
            {formatINR(s.outstandingBalance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pending client dues</p>
        </div>

        {/* Payments This Month */}
        <div
          onClick={() => onNavigate('payments')}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Received This Month</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
            {formatINR(s.paymentsThisMonth)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Service & Govt fees collected</p>
        </div>
      </div>

      {/* Recent Activity Audit Stream */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Recent System Activity</h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search recent activity..."
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {filteredActivity.length === 0 ? (
          <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-xs font-medium">No recent actions recorded yet</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Actions you perform will be logged here for full auditability</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredActivity.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                  <span className="font-semibold text-slate-300 shrink-0">{act.action}</span>
                  <span className="text-slate-400 truncate">{act.description}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                  {new Date(act.created_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
