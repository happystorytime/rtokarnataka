import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Car,
  Menu,
  X,
  Building2,
  Repeat,
  FileCheck2,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Plus
} from 'lucide-react';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openQuickAction: (action: string) => void;
  onLogout: () => void;
  alertsCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  setCurrentTab,
  openQuickAction,
  onLogout,
  alertsCount = 0
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Cases', icon: FolderOpen },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'vehicles', label: 'Vehicles', icon: Car }
  ];

  const drawerTabs = [
    { id: 'showrooms', label: 'Showrooms', icon: Building2 },
    { id: 'exchanges', label: 'Vehicle Exchanges', icon: Repeat },
    { id: 'documents', label: 'Documents & Expiries', icon: FileCheck2 },
    { id: 'payments', label: 'Payments & Financials', icon: CreditCard },
    { id: 'reminders', label: 'Reminders & Follow-ups', icon: Bell, badge: alertsCount },
    { id: 'settings', label: 'System Settings & Backup', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Drawer Sheet */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl overflow-y-auto safe-bottom animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                  KA
                </div>
                <span className="font-bold text-white text-sm">More Management Tools</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    openQuickAction('new_case');
                  }}
                  className="flex items-center gap-2 p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700/60"
                >
                  <Plus className="w-4 h-4 text-sky-400" /> New RTO Case
                </button>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    openQuickAction('new_client');
                  }}
                  className="flex items-center gap-2 p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700/60"
                >
                  <Plus className="w-4 h-4 text-emerald-400" /> Add Client
                </button>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    openQuickAction('new_vehicle');
                  }}
                  className="flex items-center gap-2 p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700/60"
                >
                  <Plus className="w-4 h-4 text-amber-400" /> Add Vehicle
                </button>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    openQuickAction('upload_doc');
                  }}
                  className="flex items-center gap-2 p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700/60"
                >
                  <Plus className="w-4 h-4 text-purple-400" /> Upload Document
                </button>
              </div>
            </div>

            {/* Navigation Options */}
            <div className="space-y-1 mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Modules
              </p>
              {drawerTabs.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                setDrawerOpen(false);
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-semibold hover:bg-rose-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Log Out of System
            </button>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 safe-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex flex-col items-center justify-center w-16 py-1 transition-all ${
                  isActive ? 'text-sky-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              </button>
            );
          })}

          {/* Menu Trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex flex-col items-center justify-center w-16 py-1 transition-all ${
              drawerOpen ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">More</span>
            {alertsCount > 0 && (
              <span className="absolute top-1 right-3 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
