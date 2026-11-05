import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Car,
  Building2,
  Repeat,
  FileCheck2,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Plus,
  ShieldAlert
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openQuickAction: (action: string) => void;
  onLogout: () => void;
  adminUsername?: string;
  alertsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openQuickAction,
  onLogout,
  adminUsername,
  alertsCount = 0
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'RTO Cases', icon: FolderOpen },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'showrooms', label: 'Showrooms', icon: Building2 },
    { id: 'exchanges', label: 'Exchange', icon: Repeat },
    { id: 'documents', label: 'Documents', icon: FileCheck2 },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reminders', label: 'Reminders', icon: Bell, badge: alertsCount },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 font-black text-sm tracking-wider">
              KA
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base tracking-tight leading-none">
                  Karnataka RTO
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  Paperwork
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-none">
                Agent & Showroom Document System
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 font-semibold shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions & Owner Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action Dropdown Trigger */}
            <div className="relative group">
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Action</span>
              </button>

              <div className="absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 hidden group-hover:block transition-all z-50">
                <button
                  onClick={() => openQuickAction('new_case')}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-sky-400" /> New RTO Case
                </button>
                <button
                  onClick={() => openQuickAction('new_client')}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" /> Add Client
                </button>
                <button
                  onClick={() => openQuickAction('new_vehicle')}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Car className="w-3.5 h-3.5 text-amber-400" /> Add Vehicle
                </button>
                <button
                  onClick={() => openQuickAction('upload_doc')}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-purple-400" /> Upload Document
                </button>
                <button
                  onClick={() => openQuickAction('record_payment')}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" /> Record Payment
                </button>
              </div>
            </div>

            {/* Owner Admin Info & Logout */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <span className="hidden md:inline-block text-xs text-slate-400">
                Owner: <strong className="text-slate-200">{adminUsername || 'Admin'}</strong>
              </span>
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
