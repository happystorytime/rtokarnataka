import React, { useState, useEffect } from 'react';
import {
  Car,
  Search,
  Plus,
  Filter,
  User,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck2,
  ShieldCheck,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  FolderOpen
} from 'lucide-react';
import { Vehicle, VehicleCategory, Client, Showroom, RTOCase, DocumentItem } from '../types';
import { api } from '../api';

interface VehiclesViewProps {
  onOpenNewCaseForVehicle?: (vehicleId: string) => void;
  onPreviewDocument?: (doc: DocumentItem) => void;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({
  onOpenNewCaseForVehicle,
  onPreviewDocument
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showroomFilter, setShowroomFilter] = useState<string>('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<(Vehicle & { cases: RTOCase[]; documents: DocumentItem[] }) | null>(null);

  // Form Fields
  const [category, setCategory] = useState<VehicleCategory>('new_vehicle');
  const [regNumber, setRegNumber] = useState('Not yet registered');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [mfgYear, setMfgYear] = useState<string>(new Date().getFullYear().toString());
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [showroomId, setShowroomId] = useState('');
  const [rcStatus, setRcStatus] = useState('Issued');
  const [rcIssueDate, setRcIssueDate] = useState('');
  const [rcValidUpto, setRcValidUpto] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNo, setInsurancePolicyNo] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [fitnessValidUpto, setFitnessValidUpto] = useState('');
  const [permitValidUpto, setPermitValidUpto] = useState('');
  const [hypothecationStatus, setHypothecationStatus] = useState<'none' | 'hypothecated'>('none');
  const [financierName, setFinancierName] = useState('');
  const [notes, setNotes] = useState('');

  // Warnings
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await api.getVehicles(search, categoryFilter, showroomFilter);
      setVehicles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [cData, sData] = await Promise.all([api.getClients(), api.getShowrooms()]);
      setClients(cData);
      setShowrooms(sData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, categoryFilter, showroomFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  // Check duplicate chassis or registration
  useEffect(() => {
    if ((chassisNumber.trim().length > 4 || (regNumber.trim().length > 4 && regNumber.toLowerCase() !== 'not yet registered')) && modalOpen) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.checkVehicleDuplicate(chassisNumber.trim(), regNumber.trim(), editingVehicle?.id);
          if (res.duplicate && res.vehicle) {
            setDuplicateWarning(
              `Duplicate ${res.field}: Matching vehicle already registered: ${res.vehicle.make} ${res.vehicle.model} (${res.vehicle.reg_number})`
            );
          } else {
            setDuplicateWarning(null);
          }
        } catch {
          // ignore
        }
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setDuplicateWarning(null);
    }
  }, [chassisNumber, regNumber, modalOpen, editingVehicle]);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setCategory('new_vehicle');
    setRegNumber('Not yet registered');
    setMake('');
    setModel('');
    setVariant('');
    setMfgYear(new Date().getFullYear().toString());
    setChassisNumber('');
    setEngineNumber('');
    setClientId('');
    setShowroomId('');
    setRcStatus('Pending');
    setRcIssueDate('');
    setRcValidUpto('');
    setInsuranceProvider('');
    setInsurancePolicyNo('');
    setInsuranceExpiry('');
    setFitnessValidUpto('');
    setPermitValidUpto('');
    setHypothecationStatus('none');
    setFinancierName('');
    setNotes('');
    setFormError(null);
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setCategory(v.category);
    setRegNumber(v.reg_number);
    setMake(v.make);
    setModel(v.model);
    setVariant(v.variant || '');
    setMfgYear(v.manufacturing_year ? v.manufacturing_year.toString() : '');
    setChassisNumber(v.chassis_number);
    setEngineNumber(v.engine_number);
    setClientId(v.client_id || '');
    setShowroomId(v.showroom_id || '');
    setRcStatus(v.rc_status || 'Issued');
    setRcIssueDate(v.rc_issue_date || '');
    setRcValidUpto(v.rc_valid_upto || '');
    setInsuranceProvider(v.insurance_provider || '');
    setInsurancePolicyNo(v.insurance_policy_no || '');
    setInsuranceExpiry(v.insurance_expiry || '');
    setFitnessValidUpto(v.fitness_valid_upto || '');
    setPermitValidUpto(v.permit_valid_upto || '');
    setHypothecationStatus(v.hypothecation_status || 'none');
    setFinancierName(v.financier_name || '');
    setNotes(v.notes || '');
    setFormError(null);
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!make.trim() || !model.trim() || !chassisNumber.trim() || !engineNumber.trim()) {
      setFormError('Make, Model, Chassis number, and Engine number are required.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Vehicle> = {
        category,
        reg_number: regNumber.trim() || 'Not yet registered',
        make: make.trim(),
        model: model.trim(),
        variant: variant.trim() || null,
        manufacturing_year: mfgYear ? Number(mfgYear) : null,
        chassis_number: chassisNumber.trim(),
        engine_number: engineNumber.trim(),
        client_id: clientId || null,
        showroom_id: showroomId || null,
        rc_status: rcStatus,
        rc_issue_date: rcIssueDate || null,
        rc_valid_upto: rcValidUpto || null,
        insurance_provider: insuranceProvider.trim() || null,
        insurance_policy_no: insurancePolicyNo.trim() || null,
        insurance_expiry: insuranceExpiry || null,
        fitness_valid_upto: fitnessValidUpto || null,
        permit_valid_upto: permitValidUpto || null,
        hypothecation_status: hypothecationStatus,
        financier_name: hypothecationStatus === 'hypothecated' ? financierName.trim() || null : null,
        notes: notes.trim() || null
      };

      if (editingVehicle) {
        await api.updateVehicle(editingVehicle.id, payload);
      } else {
        await api.createVehicle(payload);
      }

      setModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v: Vehicle) => {
    if (!window.confirm(`Are you sure you want to archive vehicle ${v.make} ${v.model} (${v.reg_number})?`)) {
      return;
    }
    try {
      await api.deleteVehicle(v.id);
      fetchVehicles();
      if (detailVehicle && detailVehicle.id === v.id) setDetailVehicle(null);
    } catch (err: any) {
      alert(err.message || 'Failed to archive vehicle');
    }
  };

  const viewVehicleDetails = async (v: Vehicle) => {
    try {
      const full = await api.getVehicle(v.id);
      setDetailVehicle(full);
    } catch (err: any) {
      alert(err.message || 'Failed to load vehicle details');
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-sky-400" /> Vehicle Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            New & used cars, two-wheelers, commercial tractors, RC details, and hypothecations
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by registration (e.g. KA-01-..), chassis VIN, engine #, client, or make..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="new_vehicle">New Vehicle</option>
            <option value="used_vehicle">Used Vehicle</option>
            <option value="tractor">Tractor / Agri</option>
            <option value="exchange_vehicle">Exchange Vehicle</option>
          </select>

          {/* Showroom Filter */}
          <select
            value={showroomFilter}
            onChange={(e) => setShowroomFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Showrooms</option>
            {showrooms.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.branch || s.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vehicles Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6">
          <Car className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white">No vehicles found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'No vehicles match your search filter.' : 'Add your first vehicle to begin paperwork and RTO tracking.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Add Vehicle Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {vehicles.map((v) => {
            const isInsExpired = v.insurance_expiry && new Date(v.insurance_expiry) < new Date();
            const isFitExpired = v.fitness_valid_upto && new Date(v.fitness_valid_upto) < new Date();

            return (
              <div
                key={v.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                          {v.reg_number}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400">
                          {v.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h3
                        onClick={() => viewVehicleDetails(v)}
                        className="text-base font-bold text-white mt-1.5 hover:text-sky-400 cursor-pointer"
                      >
                        {v.make} {v.model} {v.variant ? `(${v.variant})` : ''}
                      </h3>
                      {v.manufacturing_year && (
                        <p className="text-[11px] text-slate-400">Year: {v.manufacturing_year}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(v)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Vehicle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(v)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Archive Vehicle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 mt-3 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Chassis (VIN):</span>
                      <span className="font-mono text-slate-200">{v.chassis_number}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Engine No:</span>
                      <span className="font-mono text-slate-200">{v.engine_number}</span>
                    </div>

                    {v.client_name && (
                      <div className="flex items-center gap-1.5 text-slate-400 pt-1">
                        <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Owner: <strong className="text-slate-200">{v.client_name}</strong></span>
                      </div>
                    )}

                    {v.showroom_name && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Showroom: <strong className="text-slate-200">{v.showroom_name}</strong></span>
                      </div>
                    )}

                    {/* Expiry alerts */}
                    <div className="pt-2 flex flex-col gap-1">
                      {v.insurance_expiry && (
                        <div className={`flex items-center justify-between text-[11px] px-2 py-1 rounded-lg ${isInsExpired ? 'bg-rose-500/10 text-rose-300' : 'bg-slate-800/60 text-slate-400'}`}>
                          <span>Insurance Exp:</span>
                          <span className={isInsExpired ? 'font-bold text-rose-400' : 'text-slate-300'}>{v.insurance_expiry}</span>
                        </div>
                      )}
                      {v.fitness_valid_upto && (
                        <div className={`flex items-center justify-between text-[11px] px-2 py-1 rounded-lg ${isFitExpired ? 'bg-rose-500/10 text-rose-300' : 'bg-slate-800/60 text-slate-400'}`}>
                          <span>Fitness Valid Upto:</span>
                          <span className={isFitExpired ? 'font-bold text-rose-400' : 'text-slate-300'}>{v.fitness_valid_upto}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2">
                  <button
                    onClick={() => viewVehicleDetails(v)}
                    className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    View RTO Work History <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-sky-400" />
                {editingVehicle ? 'Edit Vehicle Details' : 'Add Vehicle'}
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
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Vehicle Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VehicleCategory)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="new_vehicle">New Vehicle</option>
                    <option value="used_vehicle">Used Vehicle</option>
                    <option value="tractor">Tractor / Agricultural</option>
                    <option value="exchange_vehicle">Exchange Vehicle</option>
                  </select>
                </div>

                {/* Registration Number */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Registration No (or "Not yet registered")
                  </label>
                  <input
                    type="text"
                    required
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g. KA-01-AB-1234 or Not yet registered"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>

                {/* Make */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Make / Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="e.g. Maruti Suzuki, TVS, Tata, Mahindra"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Swift, Apache RTR, Nexon, 575 DI"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Variant & Year */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Variant
                  </label>
                  <input
                    type="text"
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                    placeholder="e.g. VXI, Dual Channel ABS"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Mfg Year
                  </label>
                  <input
                    type="number"
                    value={mfgYear}
                    onChange={(e) => setMfgYear(e.target.value)}
                    placeholder="e.g. 2026"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Chassis Number */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Chassis Number (VIN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={chassisNumber}
                    onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                    placeholder="17-digit Chassis Number"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>

                {/* Engine Number */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Engine Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={engineNumber}
                    onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                    placeholder="Engine Serial Number"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>

                {/* Client Link */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Linked Owner / Client
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- No client linked --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.mobile})
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
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- No showroom linked --</option>
                    {showrooms.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.branch || s.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Insurance Provider & Policy */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    placeholder="e.g. ICICI Lombard / New India"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Insurance Expiry Date
                  </label>
                  <input
                    type="date"
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Fitness & Permit */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Fitness Certificate Valid Upto
                  </label>
                  <input
                    type="date"
                    value={fitnessValidUpto}
                    onChange={(e) => setFitnessValidUpto(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Permit Valid Upto (Transport / Tractor)
                  </label>
                  <input
                    type="date"
                    value={permitValidUpto}
                    onChange={(e) => setPermitValidUpto(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Hypothecation */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Hypothecation Status
                  </label>
                  <select
                    value={hypothecationStatus}
                    onChange={(e) => setHypothecationStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="none">None (Paid in Full / Free)</option>
                    <option value="hypothecated">Hypothecated to Bank / Financier</option>
                  </select>
                </div>

                {hypothecationStatus === 'hypothecated' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Bank / Financier Name
                    </label>
                    <input
                      type="text"
                      value={financierName}
                      onChange={(e) => setFinancierName(e.target.value)}
                      placeholder="e.g. HDFC Bank, Cholamandalam Finance, SBI"
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Vehicle Notes & Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Color, keys count, delivery condition, or special notes..."
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-500/20"
                >
                  {saving ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Details Modal */}
      {detailVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="flex flex-col w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {detailVehicle.make} {detailVehicle.model} ({detailVehicle.reg_number})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Category: {detailVehicle.category.replace(/_/g, ' ')} • Owner: {detailVehicle.client_name || 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(detailVehicle)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => setDetailVehicle(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Chassis (VIN)</span>
                  <span className="font-mono text-white font-bold">{detailVehicle.chassis_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Engine No</span>
                  <span className="font-mono text-white font-bold">{detailVehicle.engine_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Hypothecation</span>
                  <span className="text-slate-200 font-semibold">
                    {detailVehicle.hypothecation_status === 'hypothecated' ? detailVehicle.financier_name || 'Hypothecated' : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Showroom</span>
                  <span className="text-slate-200 font-semibold">{detailVehicle.showroom_name || 'N/A'}</span>
                </div>
              </div>

              {/* Linked RTO Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-purple-400" /> RTO Case Paperwork ({detailVehicle.cases?.length || 0})
                  </h4>
                  {onOpenNewCaseForVehicle && (
                    <button
                      onClick={() => onOpenNewCaseForVehicle(detailVehicle.id)}
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> New Case for Vehicle
                    </button>
                  )}
                </div>

                {!detailVehicle.cases || detailVehicle.cases.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">No RTO cases recorded for this vehicle yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detailVehicle.cases.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                        <div>
                          <p className="font-bold text-white">{c.case_number} • {c.service_type.replace(/_/g, ' ')}</p>
                          <p className="text-[11px] text-slate-400">Office: {c.rto_office} • Status: {c.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Uploaded Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" /> Vehicle Documents ({detailVehicle.documents?.length || 0})
                </h4>

                {!detailVehicle.documents || detailVehicle.documents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">No vehicle documents attached yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailVehicle.documents.map((d) => (
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
