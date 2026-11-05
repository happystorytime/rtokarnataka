import React, { useState, useEffect } from 'react';
import { Building2, Search, Plus, Phone, Mail, MapPin, Edit2, Trash2, X, Car, FolderOpen, AlertCircle } from 'lucide-react';
import { Showroom } from '../types';
import { api } from '../api';

export const ShowroomsView: React.FC = () => {
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShowroom, setEditingShowroom] = useState<Showroom | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branch, setBranch] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShowrooms = async () => {
    setLoading(true);
    try {
      const data = await api.getShowrooms(search);
      setShowrooms(data);
    } catch (err: any) {
      console.error('Failed to fetch showrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShowrooms();
  }, [search]);

  const openCreateModal = () => {
    setEditingShowroom(null);
    setName('');
    setCode('');
    setBranch('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('Bengaluru');
    setNotes('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (s: Showroom) => {
    setEditingShowroom(s);
    setName(s.name);
    setCode(s.code || '');
    setBranch(s.branch || '');
    setContactPerson(s.contact_person || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setAddress(s.address || '');
    setCity(s.city || 'Bengaluru');
    setNotes(s.notes || '');
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Showroom name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Showroom> = {
        name: name.trim(),
        code: code.trim() || null,
        branch: branch.trim() || null,
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || 'Bengaluru',
        notes: notes.trim() || null
      };

      if (editingShowroom) {
        await api.updateShowroom(editingShowroom.id, payload);
      } else {
        await api.createShowroom(payload);
      }

      setModalOpen(false);
      fetchShowrooms();
    } catch (err: any) {
      setError(err.message || 'Failed to save showroom');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: Showroom) => {
    if (!window.confirm(`Are you sure you want to archive showroom "${s.name}"?`)) {
      return;
    }
    try {
      await api.deleteShowroom(s.id);
      fetchShowrooms();
    } catch (err: any) {
      alert(err.message || 'Failed to archive showroom');
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-400" /> Showroom Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Auto dealerships, branch tie-ups, delivery paperwork, and exchange partners
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Showroom
        </button>
      </div>

      {/* Search */}
      <div className="relative bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by showroom name, code, branch, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : showrooms.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6">
          <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white">No showrooms registered</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add authorized dealer showrooms like TVS, Hyundai, Maruti Suzuki, Tata, or tractor dealerships you work with.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Add Showroom Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {showrooms.map((s) => (
            <div
              key={s.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    {s.code && (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 mr-1.5">
                        {s.code}
                      </span>
                    )}
                    <h3 className="text-base font-bold text-white mt-1">{s.name}</h3>
                    {s.branch && <p className="text-xs text-slate-400">{s.branch} Branch</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Showroom"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Archive Showroom"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 mt-3">
                  {s.contact_person && (
                    <div className="text-slate-400">
                      Contact Person: <strong className="text-slate-200">{s.contact_person}</strong>
                    </div>
                  )}

                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a>
                    </div>
                  )}

                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}

                  {s.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-slate-400">{s.address}, {s.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                  <Car className="w-3.5 h-3.5 text-sky-400" /> {s.vehicle_count || 0} Vehicles
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-medium">
                  <FolderOpen className="w-3.5 h-3.5 text-purple-400" /> {s.case_count || 0} Cases
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Showroom Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                {editingShowroom ? 'Edit Showroom' : 'Add Showroom'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Showroom Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mandya TVS / Advaith Hyundai"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Dealer Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. TVS-01"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Branch / Area
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Koramangala / Mandya Town"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Manager / Sales Executive"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Mobile or Landline"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="showroom@dealer.com"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Showroom location in Karnataka..."
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Commission arrangement, point of contact notes..."
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20"
                >
                  {saving ? 'Saving...' : editingShowroom ? 'Update Showroom' : 'Save Showroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
