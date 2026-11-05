import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Search,
  Plus,
  Filter,
  CheckSquare,
  Square,
  Calendar,
  AlertCircle,
  FileCheck2,
  CreditCard,
  Building2,
  User,
  Car,
  Clock,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import {
  RTOCase,
  RTOServiceType,
  RTOCaseStatus,
  ChecklistItem,
  Client,
  Vehicle,
  Showroom,
  DocumentItem,
  Payment,
  KARNATAKA_RTO_OFFICES,
  SERVICE_TYPE_LABELS,
  STATUS_BADGE_CONFIG,
  formatINR
} from '../types';
import { api } from '../api';

interface CasesViewProps {
  onRecordPaymentForCase?: (caseId: string, clientId: string) => void;
  onUploadDocumentForCase?: (caseId: string, clientId: string, vehicleId?: string) => void;
  onPreviewDocument?: (doc: DocumentItem) => void;
  defaultClientId?: string;
  defaultVehicleId?: string;
}

export const CasesView: React.FC<CasesViewProps> = ({
  onRecordPaymentForCase,
  onUploadDocumentForCase,
  onPreviewDocument,
  defaultClientId,
  defaultVehicleId
}) => {
  const [cases, setCases] = useState<RTOCase[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<RTOCase | null>(null);
  const [detailCase, setDetailCase] = useState<(RTOCase & { payments: Payment[]; documents: DocumentItem[] }) | null>(null);

  // Form Fields
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || '');
  const [showroomId, setShowroomId] = useState('');
  const [serviceType, setServiceType] = useState<RTOServiceType>('new_registration');
  const [rtoOffice, setRtoOffice] = useState(KARNATAKA_RTO_OFFICES[0]);
  const [rtoAppNo, setRtoAppNo] = useState('');
  const [status, setStatus] = useState<RTOCaseStatus>('new');
  const [openedDate, setOpenedDate] = useState(new Date().toISOString().split('T')[0]);
  const [submissionDate, setSubmissionDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [serviceCharge, setServiceCharge] = useState<number | string>(1500);
  const [governmentFee, setGovernmentFee] = useState<number | string>(1000);
  const [notes, setNotes] = useState('');
  const [receiptDetails, setReceiptDetails] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await api.getCases(search, statusFilter, serviceFilter);
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [cData, vData, sData] = await Promise.all([
        api.getClients(),
        api.getVehicles(),
        api.getShowrooms()
      ]);
      setClients(cData);
      setVehicles(vData);
      setShowrooms(sData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [search, statusFilter, serviceFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  // When opening modal with pre-selected client/vehicle
  useEffect(() => {
    if (defaultClientId) setClientId(defaultClientId);
    if (defaultVehicleId) setVehicleId(defaultVehicleId);
  }, [defaultClientId, defaultVehicleId]);

  const openCreateModal = () => {
    setEditingCase(null);
    setClientId(defaultClientId || (clients[0]?.id || ''));
    setVehicleId(defaultVehicleId || '');
    setShowroomId('');
    setServiceType('new_registration');
    setRtoOffice(KARNATAKA_RTO_OFFICES[0]);
    setRtoAppNo('');
    setStatus('new');
    setOpenedDate(new Date().toISOString().split('T')[0]);
    setSubmissionDate('');
    setDueDate('');
    setCompletionDate('');
    setServiceCharge(1500);
    setGovernmentFee(1000);
    setNotes('');
    setReceiptDetails('');
    setChecklist([]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (rc: RTOCase) => {
    setEditingCase(rc);
    setClientId(rc.client_id);
    setVehicleId(rc.vehicle_id || '');
    setShowroomId(rc.showroom_id || '');
    setServiceType(rc.service_type);
    setRtoOffice(rc.rto_office);
    setRtoAppNo(rc.rto_application_no || '');
    setStatus(rc.status);
    setOpenedDate(rc.opened_date);
    setSubmissionDate(rc.submission_date || '');
    setDueDate(rc.due_date || '');
    setCompletionDate(rc.completion_date || '');
    setServiceCharge(rc.service_charge);
    setGovernmentFee(rc.government_fee);
    setNotes(rc.notes || '');
    setReceiptDetails(rc.receipt_details || '');
    setChecklist(rc.checklist || []);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientId) {
      setFormError('Please select a client for this RTO case.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<RTOCase> = {
        client_id: clientId,
        vehicle_id: vehicleId || null,
        showroom_id: showroomId || null,
        service_type: serviceType,
        rto_office: rtoOffice,
        rto_application_no: rtoAppNo.trim() || null,
        status,
        opened_date: openedDate,
        submission_date: submissionDate || null,
        due_date: dueDate || null,
        completion_date: completionDate || null,
        service_charge: Number(serviceCharge) || 0,
        government_fee: Number(governmentFee) || 0,
        notes: notes.trim() || null,
        receipt_details: receiptDetails.trim() || null,
        checklist
      };

      if (editingCase) {
        await api.updateCase(editingCase.id, payload);
      } else {
        await api.createCase(payload);
      }

      setModalOpen(false);
      fetchCases();
      if (detailCase && editingCase && detailCase.id === editingCase.id) {
        viewCaseDetails(editingCase);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save RTO case');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rc: RTOCase) => {
    if (!window.confirm(`Are you sure you want to archive RTO case ${rc.case_number}?`)) {
      return;
    }
    try {
      await api.deleteCase(rc.id);
      fetchCases();
      if (detailCase && detailCase.id === rc.id) setDetailCase(null);
    } catch (err: any) {
      alert(err.message || 'Failed to archive case');
    }
  };

  const viewCaseDetails = async (rc: RTOCase) => {
    try {
      const full = await api.getCase(rc.id);
      setDetailCase(full);
    } catch (err: any) {
      alert(err.message || 'Failed to load case details');
    }
  };

  // Toggle checklist item status in detail modal
  const toggleChecklistItem = async (itemIndex: number, field: 'submitted' | 'verified') => {
    if (!detailCase) return;
    const updatedChecklist = [...detailCase.checklist];
    updatedChecklist[itemIndex] = {
      ...updatedChecklist[itemIndex],
      [field]: !updatedChecklist[itemIndex][field]
    };

    try {
      await api.updateCase(detailCase.id, {
        ...detailCase,
        checklist: updatedChecklist
      });
      setDetailCase({
        ...detailCase,
        checklist: updatedChecklist
      });
      fetchCases();
    } catch (err: any) {
      alert('Failed to update checklist item: ' + err.message);
    }
  };

  // Quick advance case status
  const updateStatusQuick = async (newStatus: RTOCaseStatus) => {
    if (!detailCase) return;
    try {
      const updatePayload: Partial<RTOCase> = {
        ...detailCase,
        status: newStatus,
        completion_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : detailCase.completion_date
      };
      await api.updateCase(detailCase.id, updatePayload);
      setDetailCase({
        ...detailCase,
        status: newStatus,
        completion_date: updatePayload.completion_date
      });
      fetchCases();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-indigo-400" /> Karnataka RTO Paperwork Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Registration, Transfer of Ownership (Form 29/30), Bank NOC (Form 35), and RC Renewals
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Open New RTO Case
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by case # (KA-...), Vahan app #, client name, or vehicle reg..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="documents_pending">Docs Pending</option>
            <option value="ready_to_submit">Ready to Submit</option>
            <option value="submitted_to_rto">Submitted to RTO</option>
            <option value="under_process">Under Process</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Service Type Filter */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Services</option>
            {Object.entries(SERVICE_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6">
          <FolderOpen className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white">No RTO cases found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'all' || serviceFilter !== 'all'
              ? 'No cases match your active filters.'
              : 'Open your first RTO case for vehicle registration, NOC, or transfer paperwork.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Open Case Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((rc) => {
            const badge = STATUS_BADGE_CONFIG[rc.status] || {
              bg: 'bg-slate-800',
              text: 'text-slate-300 border-slate-700',
              label: rc.status
            };
            const isOverdue =
              rc.due_date &&
              new Date(rc.due_date) < new Date() &&
              !['completed', 'cancelled', 'rejected'].includes(rc.status);

            const submittedCount = (rc.checklist || []).filter((c) => c.submitted).length;
            const totalChecklist = (rc.checklist || []).length;

            return (
              <div
                key={rc.id}
                className={`bg-slate-900/80 border rounded-2xl p-4 sm:p-5 shadow-md transition-all hover:border-slate-700 ${
                  isOverdue ? 'border-rose-500/40' : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-white">{rc.case_number}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                      {isOverdue && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                      <span className="text-xs font-medium text-slate-400">
                        {SERVICE_TYPE_LABELS[rc.service_type] || rc.service_type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Client: <strong className="text-slate-100">{rc.client_name}</strong> ({rc.client_mobile})</span>
                      </div>

                      {rc.vehicle_reg && (
                        <div className="flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>Vehicle: <strong className="text-slate-100">{rc.vehicle_reg}</strong> ({rc.vehicle_make} {rc.vehicle_model})</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>RTO: {rc.rto_office}</span>
                      </div>
                    </div>

                    {/* Timeline & Checklist Summary */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1">
                      <span>Opened: {rc.opened_date}</span>
                      {rc.due_date && (
                        <span className={isOverdue ? 'text-rose-400 font-bold' : ''}>
                          Due: {rc.due_date}
                        </span>
                      )}
                      {rc.rto_application_no && (
                        <span className="font-mono text-slate-300">Vahan App: #{rc.rto_application_no}</span>
                      )}
                      {totalChecklist > 0 && (
                        <span className="text-slate-300 font-medium bg-slate-800 px-2 py-0.5 rounded-md">
                          Docs Checklist: {submittedCount}/{totalChecklist} Submitted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Financials & Actions */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 border-slate-800/80 pt-3 lg:pt-0 gap-3 shrink-0">
                    <div className="text-left lg:text-right">
                      <div className="text-xs text-slate-400">
                        Total Fee: <span className="font-semibold text-slate-200">{formatINR(rc.total_fees)}</span>
                      </div>
                      <div className="text-xs">
                        Balance: <strong className={rc.balance && rc.balance > 0 ? 'text-amber-400 text-sm font-bold' : 'text-emerald-400'}>
                          {formatINR(rc.balance || 0)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(rc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Case"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Archive Case"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => viewCaseDetails(rc)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        Manage <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Case Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-400" />
                {editingCase ? `Edit RTO Case: ${editingCase.case_number}` : 'Open New RTO Case'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Client Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Client *
                  </label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Service Type *
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as RTOServiceType)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {Object.entries(SERVICE_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Vehicle
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- No vehicle linked yet --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_number} - {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Showroom Link */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Showroom / Dealer Link
                  </label>
                  <select
                    value={showroomId}
                    onChange={(e) => setShowroomId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Direct Client (No Showroom) --</option>
                    {showrooms.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.branch || s.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* RTO Office */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Karnataka RTO Office *
                  </label>
                  <select
                    value={rtoOffice}
                    onChange={(e) => setRtoOffice(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {KARNATAKA_RTO_OFFICES.map((off) => (
                      <option key={off} value={off}>
                        {off}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vahan App No & Status */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Vahan Application # / Ack No
                  </label>
                  <input
                    type="text"
                    value={rtoAppNo}
                    onChange={(e) => setRtoAppNo(e.target.value)}
                    placeholder="e.g. KA2601004928"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Case Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RTOCaseStatus)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="new">New</option>
                    <option value="documents_pending">Documents Pending</option>
                    <option value="ready_to_submit">Ready to Submit</option>
                    <option value="submitted_to_rto">Submitted to RTO</option>
                    <option value="under_process">Under Process</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Opened Date
                  </label>
                  <input
                    type="date"
                    value={openedDate}
                    onChange={(e) => setOpenedDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Due Date for Completion
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Financials: Service charge vs Govt fee */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Service Charge (Owner Fee) ₹
                  </label>
                  <input
                    type="number"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Government Official Fee ₹
                  </label>
                  <input
                    type="number"
                    value={governmentFee}
                    onChange={(e) => setGovernmentFee(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Case Notes & Special Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Physical paper submission details, agent notes..."
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  {saving ? 'Saving...' : editingCase ? 'Update Case' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Detailed Workspace Modal */}
      {detailCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="flex flex-col w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">{detailCase.case_number}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                      {SERVICE_TYPE_LABELS[detailCase.service_type] || detailCase.service_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Client: <strong className="text-slate-200">{detailCase.client_name}</strong> • Office: {detailCase.rto_office}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(detailCase)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Case
                </button>
                <button
                  onClick={() => setDetailCase(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Status Progression Bar */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Workflow</span>
                  <span className="text-xs font-semibold text-sky-400">Current: {detailCase.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {(['new', 'documents_pending', 'ready_to_submit', 'submitted_to_rto', 'under_process', 'completed'] as RTOCaseStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => updateStatusQuick(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        detailCase.status === st
                          ? 'bg-sky-500 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Document Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-400" /> Karnataka Required Document Checklist
                  </h4>
                  <span className="text-xs text-slate-400">
                    {detailCase.checklist.filter((i) => i.submitted).length} of {detailCase.checklist.length} collected
                  </span>
                </div>

                <div className="space-y-1.5">
                  {detailCase.checklist.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => toggleChecklistItem(idx, 'submitted')}
                          className="text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          {item.submitted ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <span className={`font-medium ${item.submitted ? 'text-slate-200 line-through' : 'text-white'}`}>
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleChecklistItem(idx, 'verified')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                            item.verified
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {item.verified ? 'Verified' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-teal-400" /> Fees & Balances
                  </h4>
                  {onRecordPaymentForCase && (
                    <button
                      onClick={() => onRecordPaymentForCase(detailCase.id, detailCase.client_id)}
                      className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Record Payment
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">Service Fee (Owner)</span>
                    <span className="font-bold text-white text-sm">{formatINR(detailCase.service_charge)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">Government Fee</span>
                    <span className="font-bold text-white text-sm">{formatINR(detailCase.government_fee)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">Amount Received</span>
                    <span className="font-bold text-emerald-400 text-sm">{formatINR(detailCase.amount_received)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">Remaining Balance</span>
                    <span className={`font-bold text-sm ${detailCase.balance && detailCase.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatINR(detailCase.balance || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attached Case Documents */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-purple-400" /> Attached Case Paperwork ({detailCase.documents?.length || 0})
                  </h4>
                  {onUploadDocumentForCase && (
                    <button
                      onClick={() => onUploadDocumentForCase(detailCase.id, detailCase.client_id, detailCase.vehicle_id || undefined)}
                      className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Upload Case Doc
                    </button>
                  )}
                </div>

                {!detailCase.documents || detailCase.documents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">No documents attached directly to this case yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailCase.documents.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => onPreviewDocument && onPreviewDocument(d)}
                        className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 cursor-pointer text-xs flex items-center justify-between transition-colors"
                      >
                        <div className="truncate mr-2">
                          <p className="font-semibold text-white truncate">{d.title}</p>
                          <p className="text-[11px] text-slate-400">{d.category} • {(d.file_size / 1024).toFixed(0)} KB</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
