import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Search,
  Upload,
  Camera,
  Download,
  Eye,
  Trash2,
  Calendar,
  AlertTriangle,
  FileText,
  User,
  Car,
  FolderOpen,
  X,
  AlertCircle
} from 'lucide-react';
import { DocumentItem, Client, Vehicle, RTOCase, DOCUMENT_CATEGORY_LABELS } from '../types';
import { api } from '../api';

interface DocumentsViewProps {
  onPreviewDocument: (doc: DocumentItem) => void;
  defaultClientId?: string;
  defaultVehicleId?: string;
  defaultCaseId?: string;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  onPreviewDocument,
  defaultClientId,
  defaultVehicleId,
  defaultCaseId
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cases, setCases] = useState<RTOCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('rc_copy');
  const [file, setFile] = useState<File | null>(null);
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || '');
  const [caseId, setCaseId] = useState(defaultCaseId || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments(search, categoryFilter);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [cData, vData, rcData] = await Promise.all([
        api.getClients(),
        api.getVehicles(),
        api.getCases()
      ]);
      setClients(cData);
      setVehicles(vData);
      setCases(rcData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const openUploadModal = () => {
    setTitle('');
    setCategory('rc_copy');
    setFile(null);
    setClientId(defaultClientId || '');
    setVehicleId(defaultVehicleId || '');
    setCaseId(defaultCaseId || '');
    setExpiryDate('');
    setNotes('');
    setError(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        // Auto-generate title from filename
        const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please select or capture a file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('category', category);
      if (clientId) formData.append('client_id', clientId);
      if (vehicleId) formData.append('vehicle_id', vehicleId);
      if (caseId) formData.append('case_id', caseId);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (notes.trim()) formData.append('notes', notes.trim());

      await api.uploadDocument(formData);
      setModalOpen(false);
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Are you sure you want to archive document "${doc.title}"?`)) {
      return;
    }
    try {
      await api.deleteDocument(doc.id);
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to archive document');
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-purple-400" /> Document Repository & Expiry Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Private encrypted server storage for RC cards, insurance certificates, Form 29/30, and Bank NOCs
          </p>
        </div>

        <button
          onClick={openUploadModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by title, file name, client name, or vehicle reg..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Document Categories</option>
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6">
          <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white">No documents uploaded yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Upload or photograph vehicle RC copies, Insurance certificates, Form 29/30, and Bank NOC letters.
          </p>
          <button
            onClick={openUploadModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold"
          >
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {documents.map((doc) => {
            const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
            const isExpiringSoon =
              doc.expiry_date &&
              !isExpired &&
              new Date(doc.expiry_date).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

            const isPdf = doc.mime_type === 'application/pdf';

            return (
              <div
                key={doc.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 font-bold text-xs">
                        {isPdf ? 'PDF' : 'IMG'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate" title={doc.title}>
                          {doc.title}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {DOCUMENT_CATEGORY_LABELS[doc.category] || doc.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onPreviewDocument(doc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Preview Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Archive Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Tags */}
                  <div className="space-y-1.5 text-xs text-slate-300 mt-3 pt-2 border-t border-slate-800/80">
                    {doc.client_name && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Client: <strong className="text-slate-200">{doc.client_name}</strong></span>
                      </div>
                    )}

                    {doc.vehicle_reg && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Car className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>Vehicle: <strong className="text-slate-200">{doc.vehicle_reg}</strong></span>
                      </div>
                    )}

                    {doc.case_number && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Case: <strong className="text-slate-200">{doc.case_number}</strong></span>
                      </div>
                    )}

                    {/* Expiry Pill */}
                    {doc.expiry_date && (
                      <div className="pt-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            isExpired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isExpiringSoon
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {isExpired ? 'EXPIRED: ' : 'Expires: '} {doc.expiry_date}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                  <span>{(doc.file_size / 1024).toFixed(0)} KB • {new Date(doc.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => onPreviewDocument(doc)}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    View / Print
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal with Camera Capture */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                Upload Paperwork / Scan Document
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

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Capture Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Select Document or Capture with Camera *
                </label>
                <div className="p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-purple-500 bg-slate-800/40 text-center transition-colors">
                  <input
                    type="file"
                    id="doc-file-input"
                    required
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="doc-file-input" className="cursor-pointer block">
                    <div className="flex justify-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                    </div>
                    {file ? (
                      <div>
                        <p className="text-xs font-bold text-white">{file.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB • Click to change</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-slate-300">Tap to upload file or take photo</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Supports PDF, JPG, PNG up to 25MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Document Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ramesh Kumar RC Smart Card"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Document Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linkings: Client, Vehicle, Case */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Link to Client
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">-- No Client Link --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Link to Vehicle
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">-- No Vehicle Link --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_number} - {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Link to RTO Case
                  </label>
                  <select
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">-- No RTO Case Link --</option>
                    {cases.map((rc) => (
                      <option key={rc.id} value={rc.id}>
                        {rc.case_number} - {rc.service_type.replace(/_/g, ' ')} ({rc.client_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Expiry Date (Tracks reminders automatically)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Document Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Physical storage folder, original vs photocopy notes..."
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                  disabled={uploading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20"
                >
                  {uploading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
