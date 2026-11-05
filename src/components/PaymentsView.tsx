import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Download,
  Trash2,
  Calendar,
  User,
  FolderOpen,
  Building2,
  TrendingUp,
  AlertCircle,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { Payment, Client, RTOCase, Showroom, formatINR } from '../types';
import { api } from '../api';

interface PaymentsViewProps {
  defaultClientId?: string;
  defaultCaseId?: string;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ defaultClientId, defaultCaseId }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<RTOCase[]>([]);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [summary, setSummary] = useState<{
    totalBilled: number;
    totalServiceCharges: number;
    totalGovernmentFees: number;
    totalClientPayments: number;
    totalRefunds: number;
    outstanding: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [caseId, setCaseId] = useState(defaultCaseId || '');
  const [showroomId, setShowroomId] = useState('');
  const [category, setCategory] = useState<'service_charge' | 'government_fee' | 'client_payment' | 'advance' | 'refund'>('client_payment');
  const [amount, setAmount] = useState<number | string>(1500);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash' | 'bank_transfer' | 'cheque'>('upi');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [pData, sData] = await Promise.all([
        api.getPayments(search, categoryFilter, methodFilter),
        api.getPaymentsSummary()
      ]);
      setPayments(pData);
      setSummary(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [cData, rcData, sData] = await Promise.all([
        api.getClients(),
        api.getCases(),
        api.getShowrooms()
      ]);
      setClients(cData);
      setCases(rcData);
      setShowrooms(sData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, categoryFilter, methodFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const openRecordModal = () => {
    setClientId(defaultClientId || (clients[0]?.id || ''));
    setCaseId(defaultCaseId || '');
    setShowroomId('');
    setCategory('client_payment');
    setAmount(1500);
    setPaymentMethod('upi');
    setReferenceNo('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await api.recordPayment({
        client_id: clientId,
        case_id: caseId || null,
        showroom_id: showroomId || null,
        category,
        amount: Number(amount),
        payment_method: paymentMethod,
        reference_no: referenceNo.trim() || null,
        payment_date: paymentDate,
        notes: notes.trim() || null
      });

      setModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Payment) => {
    if (!window.confirm(`Are you sure you want to archive payment receipt ${p.payment_number}?`)) {
      return;
    }
    try {
      await api.deletePayment(p.id);
      fetchPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to archive payment');
    }
  };

  const handleExportCsv = async () => {
    try {
      await api.exportPaymentsCsv();
    } catch (err: any) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const CATEGORY_LABELS: Record<string, string> = {
    client_payment: 'Client Payment Received',
    advance: 'Advance Received',
    service_charge: 'Agent Service Charge',
    government_fee: 'Government / RTO Official Fee',
    refund: 'Client Refund'
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-teal-400" /> Payments & Financial Accounting
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            UPI, Cash, and Bank receipts with clear segregation of Government fees and owner Service charges
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
          <button
            onClick={openRecordModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-teal-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs font-medium text-slate-400">Total Billed across Cases</span>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              {formatINR(summary.totalBilled)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Govt fees + Agent service</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs font-medium text-slate-400">Total Received from Clients</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight mt-1">
              {formatINR(summary.totalClientPayments)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">UPI, Cash & Bank transfers</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs font-medium text-slate-400">Outstanding Balance</span>
            <div className="text-xl sm:text-2xl font-bold text-amber-400 tracking-tight mt-1">
              {formatINR(summary.outstanding)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Pending client payments</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs font-medium text-slate-400">Government Fees Tracked</span>
            <div className="text-xl sm:text-2xl font-bold text-sky-400 tracking-tight mt-1">
              {formatINR(summary.totalGovernmentFees)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Pass-through RTO tax & treasury</p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments by receipt #, UTR reference, client name, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="client_payment">Client Payment</option>
            <option value="advance">Advance</option>
            <option value="service_charge">Service Charge</option>
            <option value="government_fee">Government Fee</option>
            <option value="refund">Refund</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Methods</option>
            <option value="upi">UPI / GPay / PhonePe</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer / IMPS</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Payments Ledger Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6">
          <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white">No payment transactions recorded</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Record customer advance payments, final RTO fee settlements, and official government fee disbursements.
          </p>
          <button
            onClick={openRecordModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Receipt / Date</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Case / Showroom</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Method & Ref</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono">
                      <span className="font-bold text-white block">{p.payment_number}</span>
                      <span className="text-[11px] text-slate-400">{p.payment_date}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white block">{p.client_name}</span>
                      <span className="text-[11px] text-slate-400">{p.client_mobile}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.case_number ? (
                        <span className="font-mono text-indigo-400 block">{p.case_number}</span>
                      ) : (
                        <span className="text-slate-500">General</span>
                      )}
                      {p.showroom_name && <span className="text-[10px] text-slate-400">{p.showroom_name}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-semibold uppercase">
                        {CATEGORY_LABELS[p.category] || p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-200 uppercase block">{p.payment_method}</span>
                      {p.reference_no && <span className="font-mono text-[11px] text-slate-400">Ref: {p.reference_no}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-bold font-mono ${
                          p.category === 'refund' ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {p.category === 'refund' ? '-' : '+'}{formatINR(p.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Archive Payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-400" />
                Record Payment / Transaction
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
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Linked Case */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Linked RTO Case (Optional)
                  </label>
                  <select
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">-- No specific case (General payment) --</option>
                    {cases.map((rc) => (
                      <option key={rc.id} value={rc.id}>
                        {rc.case_number} - {rc.service_type.replace(/_/g, ' ')} ({rc.client_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="client_payment">Client Payment Received</option>
                    <option value="advance">Advance Received</option>
                    <option value="service_charge">Agent Service Fee</option>
                    <option value="government_fee">Government Official Fee</option>
                    <option value="refund">Refund to Client</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Reference Number */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    UTR / UPI Reference / Cheque No
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. UPI 432810928392 or Cheque #000124"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Receipt notes or payer comments..."
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/20"
                >
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
