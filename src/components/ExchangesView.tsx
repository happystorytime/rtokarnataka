import React, { useState, useEffect } from 'react';
import { Repeat, Plus, Search, Car, User, Building2, AlertCircle, ArrowRight, Trash2, X } from 'lucide-react';
import { VehicleExchange, Client, Vehicle, Showroom, formatINR } from '../types';
import { api } from '../api';

export const ExchangesView: React.FC = () => {
  const [exchanges, setExchanges] = useState<VehicleExchange[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [oldVehicleId, setOldVehicleId] = useState('');
  const [newVehicleId, setNewVehicleId] = useState('');
  const [showroomId, setShowroomId] = useState('');
  const [valuationAmount, setValuationAmount] = useState<number | string>(150000);
  const [agreedAmount, setAgreedAmount] = useState<number | string>(140000);
  const [loanOutstanding, setLoanOutstanding] = useState<number | string>(0);
  const [hypothecationStatus, setHypothecationStatus] = useState<'none' | 'pending' | 'settled'>('none');
  const [transferStatus, setTransferStatus] = useState<'pending' | 'forms_signed' | 'submitted' | 'completed'>('pending');
  const [receivedFromClient, setReceivedFromClient] = useState<number | string>(0);
  const [paidToClient, setPaidToClient] = useState<number | string>(0);
  const [exchangeDate, setExchangeDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExchanges = async () => {
    setLoading(true);
    try {
      const data = await api.getExchanges();
      setExchanges(data);
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
    fetchExchanges();
    fetchDependencies();
  }, []);

  const openCreateModal = () => {
    setClientId(clients[0]?.id || '');
    setOldVehicleId('');
    setNewVehicleId('');
    setShowroomId('');
    setValuationAmount(150000);
    setAgreedAmount(140000);
    setLoanOutstanding(0);
    setHypothecationStatus('none');
    setTransferStatus('pending');
    setReceivedFromClient(0);
    setPaidToClient(0);
    setExchangeDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientId || !oldVehicleId || !newVehicleId) {
      setError('Client, Old Vehicle (Exchanged-In), and New Vehicle (Delivered) are required.');
      return;
    }

    if (oldVehicleId === newVehicleId) {
      setError('Old vehicle and new vehicle cannot be the same vehicle record.');
      return;
    }

    setSaving(true);
    try {
      await api.createExchange({
        client_id: clientId,
        old_vehicle_id: oldVehicleId,
        new_vehicle_id: newVehicleId,
        showroom_id: showroomId || null,
        valuation_amount: Number(valuationAmount) || 0,
        agreed_exchange_amount: Number(agreedAmount) || 0,
        loan_outstanding_amount: Number(loanOutstanding) || 0,
        hypothecation_settlement_status: hypothecationStatus,
        transfer_paperwork_status: transferStatus,
        amount_received_from_client: Number(receivedFromClient) || 0,
        amount_paid_to_client: Number(paidToClient) || 0,
        exchange_date: exchangeDate,
        notes: notes.trim() || null
      });

      setModalOpen(false);
      fetchExchanges();
    } catch (err: any) {
      setError(err.message || 'Failed to record vehicle exchange');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exc: VehicleExchange) => {
    if (!window.confirm(`Are you sure you want to delete exchange record ${exc.exchange_number}?`)) {
      return;
    }
    try {
      await api.deleteExchange(exc.id);
      fetchExchanges();
    } catch (err: any) {
      alert(err.message || 'Failed to delete exchange record');
    }
  };

  // Calculations for net equity
  const agreedVal = Number(agreedAmount) || 0;
  const loanVal = Number(loanOutstanding) || 0;
  const netOldEquity = agreedVal - loanVal;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Repeat className="w-6 h-6 text-amber-400" /> Vehicle Exchange Workflow
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Old-vehicle-for-new-vehicle exchange tracking, agreed valuations, hypothecation settlements, and transfer paperwork
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Record Vehicle Exchange
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : exchanges.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6">
          <Repeat className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white">No vehicle exchanges recorded</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Record customer exchange deals where an old trade-in vehicle is swapped towards a new car, scooter, or tractor.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> New Exchange
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {exchanges.map((exc) => (
            <div
              key={exc.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400">{exc.exchange_number}</span>
                  <span className="text-xs text-slate-400">• Date: {exc.exchange_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Transfer: {exc.transfer_paperwork_status.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => handleDelete(exc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Trade-in vs New Vehicle Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Old Vehicle (Trade-In) */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    Old Vehicle (Trade-In)
                  </span>
                  <p className="font-bold text-white text-sm">
                    {exc.old_vehicle_make} {exc.old_vehicle_model}
                  </p>
                  <p className="font-mono text-xs text-slate-300 font-bold">{exc.old_vehicle_reg}</p>
                  <p className="text-xs text-slate-400">
                    Owner: <strong className="text-slate-200">{exc.client_name}</strong>
                  </p>
                </div>

                {/* New Vehicle (Delivered) */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    New Vehicle (Delivered)
                  </span>
                  <p className="font-bold text-white text-sm">
                    {exc.new_vehicle_make} {exc.new_vehicle_model}
                  </p>
                  <p className="font-mono text-xs text-slate-300 font-bold">{exc.new_vehicle_reg}</p>
                  <p className="text-xs text-slate-400">
                    Showroom: <strong className="text-slate-200">{exc.showroom_name || 'Direct'}</strong>
                  </p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-slate-800/40">
                  <span className="text-slate-500 block">Agreed Valuation</span>
                  <span className="font-bold text-white text-sm">{formatINR(exc.agreed_exchange_amount)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40">
                  <span className="text-slate-500 block">Loan Deduction</span>
                  <span className="font-bold text-rose-400 text-sm">-{formatINR(exc.loan_outstanding_amount)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40">
                  <span className="text-slate-500 block">Net Trade Equity</span>
                  <span className="font-bold text-amber-400 text-sm">{formatINR(exc.net_difference)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40">
                  <span className="text-slate-500 block">Bank Settlement</span>
                  <span className="font-semibold text-slate-200 uppercase text-[11px]">
                    {exc.hypothecation_settlement_status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Repeat className="w-5 h-5 text-amber-400" />
                Record Vehicle Exchange
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Client */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Client *
                  </label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Old Vehicle */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Old Vehicle (Trade-In) *
                  </label>
                  <select
                    required
                    value={oldVehicleId}
                    onChange={(e) => setOldVehicleId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Select Old Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_number} - {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                {/* New Vehicle */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    New Vehicle (Purchased) *
                  </label>
                  <select
                    required
                    value={newVehicleId}
                    onChange={(e) => setNewVehicleId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Select New Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_number} - {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Showroom */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Showroom / Dealer Link
                  </label>
                  <select
                    value={showroomId}
                    onChange={(e) => setShowroomId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Direct Deal (No Showroom) --</option>
                    {showrooms.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.branch || s.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valuation & Agreed Amount */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Assessed Valuation ₹
                  </label>
                  <input
                    type="number"
                    value={valuationAmount}
                    onChange={(e) => setValuationAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Agreed Exchange Price ₹ *
                  </label>
                  <input
                    type="number"
                    required
                    value={agreedAmount}
                    onChange={(e) => setAgreedAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Loan Outstanding & Settlement */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Old Loan Outstanding (to deduct) ₹
                  </label>
                  <input
                    type="number"
                    value={loanOutstanding}
                    onChange={(e) => setLoanOutstanding(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Hypothecation Settlement
                  </label>
                  <select
                    value={hypothecationStatus}
                    onChange={(e) => setHypothecationStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="none">No Loan</option>
                    <option value="pending">Settlement Pending</option>
                    <option value="settled">NOC Cleared & Settled</option>
                  </select>
                </div>

                {/* Transfer Paperwork Status */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Transfer Paperwork (Form 29/30)
                  </label>
                  <select
                    value={transferStatus}
                    onChange={(e) => setTransferStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="forms_signed">Forms Signed</option>
                    <option value="submitted">Submitted to RTO</option>
                    <option value="completed">Transfer Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Exchange Date
                  </label>
                  <input
                    type="date"
                    value={exchangeDate}
                    onChange={(e) => setExchangeDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Net Difference Preview */}
                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Net Equity from Old Vehicle:</span>
                  <span className="text-amber-400 font-bold text-sm">{formatINR(netOldEquity)}</span>
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/20"
                >
                  {saving ? 'Saving...' : 'Save Exchange Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
