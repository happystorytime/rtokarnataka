import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  Car,
  FolderOpen,
  CreditCard,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Client, formatINR, Vehicle, RTOCase, Payment, DocumentItem, VehicleExchange } from '../types';
import { api } from '../api';

interface ClientsViewProps {
  onOpenNewCaseForClient?: (clientId: string) => void;
  onOpenNewVehicleForClient?: (clientId: string) => void;
  onPreviewDocument?: (doc: DocumentItem) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  onOpenNewCaseForClient,
  onOpenNewVehicleForClient,
  onPreviewDocument
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<(Client & { vehicles: Vehicle[]; cases: RTOCase[]; payments: Payment[]; documents: DocumentItem[]; exchanges: VehicleExchange[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Duplicate warning
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients(search, statusFilter);
      setClients(data);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, statusFilter]);

  // Check duplicate when typing mobile number
  useEffect(() => {
    if (mobile.trim().length >= 10 && modalOpen) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.checkClientDuplicate(mobile.trim(), editingClient ? editingClient.id : undefined);
          if (res.duplicate && res.client) {
            setDuplicateWarning(`A client named "${res.client.full_name}" already exists with mobile number ${mobile.trim()}`);
          } else {
            setDuplicateWarning(null);
          }
        } catch {
          // ignore
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDuplicateWarning(null);
    }
  }, [mobile, modalOpen, editingClient]);

  const openCreateModal = () => {
    setEditingClient(null);
    setFullName('');
    setMobile('');
    setAltPhone('');
    setEmail('');
    setAddress('');
    setCity('Bengaluru');
    setPincode('');
    setNotes('');
    setFollowUpDate('');
    setFollowUpNotes('');
    setFormError(null);
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFullName(client.full_name);
    setMobile(client.mobile);
    setAltPhone(client.alt_phone || '');
    setEmail(client.email || '');
    setAddress(client.address || '');
    setCity(client.city || 'Bengaluru');
    setPincode(client.pincode || '');
    setNotes(client.notes || '');
    setFollowUpDate(client.follow_up_date || '');
    setFollowUpNotes(client.follow_up_notes || '');
    setFormError(null);
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !mobile.trim()) {
      setFormError('Full name and mobile number are required.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Client> = {
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        alt_phone: altPhone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || 'Bengaluru',
        pincode: pincode.trim() || null,
        notes: notes.trim() || null,
        follow_up_date: followUpDate || null,
        follow_up_notes: followUpNotes.trim() || null
      };

      if (editingClient) {
        await api.updateClient(editingClient.id, payload);
      } else {
        await api.createClient(payload);
      }

      setModalOpen(false);
      fetchClients();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Are you sure you want to archive client ${client.full_name}?`)) {
      return;
    }
    try {
      await api.deleteClient(client.id);
      fetchClients();
      if (detailClient && detailClient.id === client.id) {
        setDetailClient(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to archive client');
    }
  };

  const viewClientDetails = async (client: Client) => {
    setDetailLoading(true);
    try {
      const full = await api.getClient(client.id);
      setDetailClient(full);
    } catch (err: any) {
      alert(err.message || 'Failed to load client details');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" /> Client Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Owner records, linked vehicles, RTO cases, follow-ups, and payment histories
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Client
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, mobile number, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-300 focus:outline-none"
          >
            <option value="active">Active Clients</option>
            <option value="all">All Clients</option>
          </select>
        </div>
      </div>

      {/* Clients List / Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6">
          <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white">No clients found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'No clients match your search query.' : 'Add your first vehicle owner or customer to start tracking paperwork.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Add Client Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {clients.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500">{c.id}</span>
                    <h3 className="text-base font-bold text-white hover:text-emerald-400 cursor-pointer" onClick={() => viewClientDetails(c)}>
                      {c.full_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Client"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Archive Client"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 mt-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <a href={`tel:${c.mobile}`} className="hover:underline">{c.mobile}</a>
                    {c.alt_phone && <span className="text-slate-500 text-[11px]">/ {c.alt_phone}</span>}
                  </div>

                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}

                  {c.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-slate-400">{c.address}, {c.city}</span>
                    </div>
                  )}
                </div>

                {/* Linked Counters */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                    {c.vehicle_count || 0} Vehicles
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-medium">
                    {c.case_count || 0} RTO Cases
                  </span>
                  {c.follow_up_date && (
                    <span className="ml-auto text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" /> {c.follow_up_date}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-2">
                <button
                  onClick={() => viewClientDetails(c)}
                  className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  View Full History & Files <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                {editingClient ? 'Edit Client Record' : 'Add New Client'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9845012345"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Alternate Phone
                  </label>
                  <input
                    type="tel"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="Optional secondary phone"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Optional email address"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Residential / Office Address
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, area, landmark in Karnataka..."
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru, Mandya, Mysuru"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 560034"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Follow-up Notes
                  </label>
                  <input
                    type="text"
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="e.g. Collect Form 29 signature"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    General Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Private notes, references, or instructions..."
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20"
                >
                  {saving ? 'Saving...' : editingClient ? 'Update Client' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Detail Drawer / Modal */}
      {detailClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="flex flex-col w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  {detailClient.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">{detailClient.full_name}</h3>
                  <p className="text-xs text-slate-400">
                    ID: {detailClient.id} • {detailClient.mobile} • {detailClient.city}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openEditModal(detailClient);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => setDetailClient(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Linked Vehicles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-sky-400" /> Linked Vehicles ({detailClient.vehicles?.length || 0})
                  </h4>
                  {onOpenNewVehicleForClient && (
                    <button
                      onClick={() => onOpenNewVehicleForClient(detailClient.id)}
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Vehicle
                    </button>
                  )}
                </div>

                {!detailClient.vehicles || detailClient.vehicles.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">No vehicles currently linked to this client.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailClient.vehicles.map((v) => (
                      <div key={v.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{v.reg_number}</span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[10px] uppercase font-semibold">
                            {v.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-slate-300">{v.make} {v.model} ({v.manufacturing_year || 'N/A'})</p>
                        <p className="text-slate-400 text-[11px] font-mono">VIN: {v.chassis_number}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked RTO Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-purple-400" /> RTO Paperwork Cases ({detailClient.cases?.length || 0})
                  </h4>
                  {onOpenNewCaseForClient && (
                    <button
                      onClick={() => onOpenNewCaseForClient(detailClient.id)}
                      className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> New Case
                    </button>
                  )}
                </div>

                {!detailClient.cases || detailClient.cases.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">No active or past RTO cases for this client.</p>
                ) : (
                  <div className="space-y-2">
                    {detailClient.cases.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{c.case_number}</span>
                            <span className="text-slate-400">({c.service_type.replace(/_/g, ' ')})</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Office: {c.rto_office} • Opened: {c.opened_date}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold text-[10px] uppercase">
                            {c.status.replace(/_/g, ' ')}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Balance: <strong className="text-amber-400">{formatINR(c.balance || 0)}</strong>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Uploaded Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" /> Uploaded Documents ({detailClient.documents?.length || 0})
                </h4>

                {!detailClient.documents || detailClient.documents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">No files uploaded under this client record.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailClient.documents.map((d) => (
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

              {/* Payment History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-teal-400" /> Payment & Receipt History ({detailClient.payments?.length || 0})
                </h4>

                {!detailClient.payments || detailClient.payments.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">No payments recorded for this client.</p>
                ) : (
                  <div className="space-y-2">
                    {detailClient.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                        <div>
                          <p className="font-semibold text-white">{p.payment_number} • {p.payment_date}</p>
                          <p className="text-[11px] text-slate-400">
                            {p.category.replace(/_/g, ' ')} via {p.payment_method.toUpperCase()} {p.reference_no && `(Ref: ${p.reference_no})`}
                          </p>
                        </div>
                        <span className="font-bold text-emerald-400 text-sm">
                          {formatINR(p.amount)}
                        </span>
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
