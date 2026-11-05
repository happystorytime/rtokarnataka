/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { CasesView } from './components/CasesView';
import { ClientsView } from './components/ClientsView';
import { VehiclesView } from './components/VehiclesView';
import { ShowroomsView } from './components/ShowroomsView';
import { ExchangesView } from './components/ExchangesView';
import { DocumentsView } from './components/DocumentsView';
import { PaymentsView } from './components/PaymentsView';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { DashboardStats, DocumentItem } from './types';
import { api, clearStoredToken } from './api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [authInitialized, setAuthInitialized] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>('admin');

  // Dashboard Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Global Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Contextual modal actions
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>();
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>();

  // Verify auth on mount with retry handling for dev server startup
  const checkAuth = async (retries = 3) => {
    try {
      const res = await api.getAuthStatus();
      setAuthInitialized(res.initialized);
      setAuthenticated(res.authenticated);
      if (res.username) setAdminUsername(res.username);

      if (res.authenticated) {
        loadStats();
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
      if (retries > 0) {
        setTimeout(() => checkAuth(retries - 1), 1000);
        return;
      }
      // If server took longer to connect, default to initialized so user sees Unlock Login
      setAuthInitialized(true);
      setAuthenticated(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const s = await api.getDashboardStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setAuthenticated(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleLoginSuccess = (user: string) => {
    setAdminUsername(user);
    setAuthInitialized(true);
    setAuthenticated(true);
    loadStats();
  };

  const handleLogout = async () => {
    try {
      await api.logoutAdmin();
    } catch {
      // ignore
    }
    clearStoredToken();
    setAuthenticated(false);
  };

  const handleQuickAction = (action: string) => {
    if (action === 'new_case') {
      setSelectedClientId(undefined);
      setSelectedVehicleId(undefined);
      setCurrentTab('cases');
    } else if (action === 'new_client') {
      setCurrentTab('clients');
    } else if (action === 'new_vehicle') {
      setSelectedClientId(undefined);
      setCurrentTab('vehicles');
    } else if (action === 'upload_doc') {
      setSelectedClientId(undefined);
      setSelectedVehicleId(undefined);
      setSelectedCaseId(undefined);
      setCurrentTab('documents');
    } else if (action === 'record_payment') {
      setSelectedClientId(undefined);
      setSelectedCaseId(undefined);
      setCurrentTab('payments');
    }
  };

  // Calculate alerts badge
  const alertsCount =
    (stats?.casesOverdue || 0) + (stats?.casesDueToday || 0) + (stats?.expiringDocumentsCount || 0);

  // If auth is still checking or unauthenticated, show AuthModal
  if (authInitialized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Initializing Karnataka RTO System...</p>
        </div>
      </div>
    );
  }

  if (authInitialized === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Connecting to Karnataka RTO Database...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <AuthModal
          isInitialized={authInitialized}
          defaultUsername={adminUsername}
          onSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Desktop Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        openQuickAction={handleQuickAction}
        onLogout={handleLogout}
        adminUsername={adminUsername}
        alertsCount={alertsCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            loading={statsLoading}
            onNavigate={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            openQuickAction={handleQuickAction}
          />
        )}

        {currentTab === 'cases' && (
          <CasesView
            defaultClientId={selectedClientId}
            defaultVehicleId={selectedVehicleId}
            onRecordPaymentForCase={(caseId, clientId) => {
              setSelectedCaseId(caseId);
              setSelectedClientId(clientId);
              setCurrentTab('payments');
            }}
            onUploadDocumentForCase={(caseId, clientId, vehicleId) => {
              setSelectedCaseId(caseId);
              setSelectedClientId(clientId);
              setSelectedVehicleId(vehicleId);
              setCurrentTab('documents');
            }}
            onPreviewDocument={(doc) => setPreviewDoc(doc)}
          />
        )}

        {currentTab === 'clients' && (
          <ClientsView
            onOpenNewCaseForClient={(clientId) => {
              setSelectedClientId(clientId);
              setSelectedVehicleId(undefined);
              setCurrentTab('cases');
            }}
            onOpenNewVehicleForClient={(clientId) => {
              setSelectedClientId(clientId);
              setCurrentTab('vehicles');
            }}
            onPreviewDocument={(doc) => setPreviewDoc(doc)}
          />
        )}

        {currentTab === 'vehicles' && (
          <VehiclesView
            onOpenNewCaseForVehicle={(vehicleId) => {
              setSelectedVehicleId(vehicleId);
              setSelectedClientId(undefined);
              setCurrentTab('cases');
            }}
            onPreviewDocument={(doc) => setPreviewDoc(doc)}
          />
        )}

        {currentTab === 'showrooms' && <ShowroomsView />}

        {currentTab === 'exchanges' && <ExchangesView />}

        {currentTab === 'documents' && (
          <DocumentsView
            defaultClientId={selectedClientId}
            defaultVehicleId={selectedVehicleId}
            defaultCaseId={selectedCaseId}
            onPreviewDocument={(doc) => setPreviewDoc(doc)}
          />
        )}

        {currentTab === 'payments' && (
          <PaymentsView defaultClientId={selectedClientId} defaultCaseId={selectedCaseId} />
        )}

        {currentTab === 'reminders' && <RemindersView />}

        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Global In-App Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {/* iPhone / Mobile Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        openQuickAction={handleQuickAction}
        onLogout={handleLogout}
        alertsCount={alertsCount}
      />
    </div>
  );
}
