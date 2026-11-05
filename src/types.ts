export interface Client {
  id: string;
  full_name: string;
  mobile: string;
  alt_phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string;
  pincode?: string | null;
  notes?: string | null;
  follow_up_date?: string | null;
  follow_up_status?: 'pending' | 'contacted' | 'completed' | 'snoozed';
  follow_up_notes?: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  vehicle_count?: number;
  case_count?: number;
}

export interface Showroom {
  id: string;
  name: string;
  code?: string | null;
  branch?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string;
  notes?: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  vehicle_count?: number;
  case_count?: number;
}

export type VehicleCategory = 'new_vehicle' | 'used_vehicle' | 'tractor' | 'exchange_vehicle';

export interface Vehicle {
  id: string;
  category: VehicleCategory;
  reg_number: string;
  make: string;
  model: string;
  variant?: string | null;
  manufacturing_year?: number | null;
  chassis_number: string;
  engine_number: string;
  client_id?: string | null;
  client_name?: string | null;
  client_mobile?: string | null;
  client_address?: string | null;
  showroom_id?: string | null;
  showroom_name?: string | null;
  showroom_branch?: string | null;
  rc_status?: string | null;
  rc_issue_date?: string | null;
  rc_valid_upto?: string | null;
  insurance_provider?: string | null;
  insurance_policy_no?: string | null;
  insurance_expiry?: string | null;
  fitness_valid_upto?: string | null;
  permit_valid_upto?: string | null;
  hypothecation_status?: 'none' | 'hypothecated';
  financier_name?: string | null;
  notes?: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export type RTOServiceType =
  | 'new_registration'
  | 'ownership_transfer'
  | 'noc'
  | 'hypothecation_termination'
  | 'rc_renewal'
  | 'duplicate_rc'
  | 'insurance_renewal'
  | 'fitness_permit'
  | 'address_change'
  | 'other';

export type RTOCaseStatus =
  | 'new'
  | 'documents_pending'
  | 'ready_to_submit'
  | 'submitted_to_rto'
  | 'under_process'
  | 'on_hold'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
  submitted: boolean;
  verified: boolean;
  notes?: string;
}

export interface RTOCase {
  id: string;
  case_number: string;
  client_id: string;
  client_name?: string;
  client_mobile?: string;
  vehicle_id?: string | null;
  vehicle_reg?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  showroom_id?: string | null;
  showroom_name?: string | null;
  service_type: RTOServiceType;
  rto_office: string;
  rto_application_no?: string | null;
  status: RTOCaseStatus;
  checklist: ChecklistItem[];
  opened_date: string;
  submission_date?: string | null;
  due_date?: string | null;
  completion_date?: string | null;
  service_charge: number;
  government_fee: number;
  total_fees?: number;
  amount_received?: number;
  balance?: number;
  notes?: string | null;
  receipt_details?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleExchange {
  id: string;
  exchange_number: string;
  client_id: string;
  client_name?: string;
  client_mobile?: string;
  old_vehicle_id: string;
  old_vehicle_reg?: string;
  old_vehicle_make?: string;
  old_vehicle_model?: string;
  new_vehicle_id: string;
  new_vehicle_reg?: string;
  new_vehicle_make?: string;
  new_vehicle_model?: string;
  showroom_id?: string | null;
  showroom_name?: string | null;
  valuation_amount: number;
  agreed_exchange_amount: number;
  loan_outstanding_amount: number;
  hypothecation_settlement_status: 'none' | 'pending' | 'settled';
  transfer_paperwork_status: 'pending' | 'forms_signed' | 'submitted' | 'completed';
  amount_received_from_client: number;
  amount_paid_to_client: number;
  net_difference: number;
  exchange_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  client_id?: string | null;
  client_name?: string | null;
  vehicle_id?: string | null;
  vehicle_reg?: string | null;
  case_id?: string | null;
  case_number?: string | null;
  showroom_id?: string | null;
  exchange_id?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  client_id: string;
  client_name?: string;
  client_mobile?: string;
  case_id?: string | null;
  case_number?: string | null;
  service_type?: string | null;
  showroom_id?: string | null;
  showroom_name?: string | null;
  category: 'service_charge' | 'government_fee' | 'client_payment' | 'advance' | 'refund';
  amount: number;
  payment_method: 'upi' | 'cash' | 'bank_transfer' | 'cheque';
  reference_no?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  type: 'document_expiry' | 'case_due' | 'follow_up' | 'balance_due' | 'custom';
  title: string;
  description?: string | null;
  due_date: string;
  status: 'pending' | 'completed' | 'snoozed';
  snoozed_until?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata?: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalClients: number;
  totalVehicles: number;
  totalShowrooms: number;
  openCases: number;
  casesDueToday: number;
  casesOverdue: number;
  expiringDocumentsCount: number;
  outstandingBalance: number;
  paymentsThisMonth: number;
  recentActivity: ActivityItem[];
}

// Karnataka RTO offices reference list
export const KARNATAKA_RTO_OFFICES = [
  'KA-01 (Bengaluru Central - Koramangala)',
  'KA-02 (Bengaluru West - Rajajinagar)',
  'KA-03 (Bengaluru East - Indiranagar)',
  'KA-04 (Bengaluru North - Yeshwanthpur)',
  'KA-05 (Bengaluru South - Jayanagar)',
  'KA-06 (Tumakuru)',
  'KA-07 (Kolar)',
  'KA-08 (KGF - Kolar Gold Fields)',
  'KA-09 (Mysuru West)',
  'KA-10 (Chamrajnagar)',
  'KA-11 (Mandya)',
  'KA-12 (Madikeri - Kodagu)',
  'KA-13 (Hassan)',
  'KA-14 (Shivamogga)',
  'KA-15 (Sagara)',
  'KA-16 (Chitradurga)',
  'KA-17 (Davanagere)',
  'KA-18 (Chikkamagaluru)',
  'KA-19 (Mangaluru)',
  'KA-20 (Udupi)',
  'KA-21 (Puttur)',
  'KA-22 (Belagavi)',
  'KA-23 (Chikkodi)',
  'KA-24 (Bailhongal)',
  'KA-25 (Dharwad)',
  'KA-26 (Gadag)',
  'KA-27 (Haveri)',
  'KA-28 (Vijayapura / Bijapur)',
  'KA-29 (Bagalkote)',
  'KA-30 (Karwar - Uttara Kannada)',
  'KA-31 (Sirsi)',
  'KA-32 (Kalaburagi / Gulbarga)',
  'KA-33 (Yadgir)',
  'KA-34 (Ballari)',
  'KA-35 (Hosapete / Vijayanagara)',
  'KA-36 (Raichur)',
  'KA-37 (Koppal)',
  'KA-38 (Bidar)',
  'KA-39 (Bhalki)',
  'KA-40 (Chikkaballapura)',
  'KA-41 (Bengaluru - Jnanabharathi / Kengeri)',
  'KA-42 (Ramanagara)',
  'KA-43 (Devanahalli - Bengaluru Rural)',
  'KA-44 (Tiptur)',
  'KA-45 (Hunsur)',
  'KA-50 (Yelahanka - Bengaluru)',
  'KA-51 (Electronic City - Bengaluru)',
  'KA-52 (Nelamangala)',
  'KA-53 (KR Puram - Bengaluru)',
  'KA-54 (Nagamangala)',
  'KA-55 (Mysuru East)',
  'KA-56 (Basavakalyan)',
  'KA-57 (Shantinagar - Bengaluru)',
  'KA-58 (Banaswadi - Bengaluru)',
  'KA-59 (Chandapura - Anekal)',
  'KA-60 (R.T. Nagar - Bengaluru)',
  'KA-61 (Marathahalli - Bengaluru)',
  'KA-62 (Surathkal)',
  'KA-63 (Hubballi)',
  'KA-64 (Madhugiri)',
  'KA-65 (Dandeli)',
  'KA-66 (Tarikere)',
  'KA-67 (Sedam)',
  'KA-68 (Ranebennur)',
  'KA-69 (Ramdurg)',
  'KA-70 (Bantwal)',
  'KA-71 (Athani)'
];

export const SERVICE_TYPE_LABELS: Record<RTOServiceType, string> = {
  new_registration: 'New Registration',
  ownership_transfer: 'Ownership Transfer',
  noc: 'NOC (No Objection Certificate)',
  hypothecation_termination: 'Hypothecation Termination (Form 35)',
  rc_renewal: 'RC Renewal / Re-registration',
  duplicate_rc: 'Duplicate RC',
  insurance_renewal: 'Insurance Renewal',
  fitness_permit: 'Fitness & Permit',
  address_change: 'Address Change in RC',
  other: 'Other RTO Service'
};

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  rc_copy: 'RC Copy / Smart Card',
  insurance_policy: 'Insurance Policy',
  form_29_30: 'Form 29 / Form 30 (Transfer Notice)',
  form_35_bank_noc: 'Form 35 / Bank NOC',
  form_28_noc: 'Form 28 (NOC)',
  puc_emission: 'PUC / Emission Certificate',
  driving_licence: 'Driving Licence Copy',
  address_proof: 'Karnataka Address Proof',
  aadhaar_pan: 'Aadhaar / PAN Card Copy',
  showroom_invoice: 'Showroom Invoice / Sale Cert',
  fitness_cert: 'Fitness Certificate',
  tax_token: 'Road Tax Token / Green Tax',
  other: 'Other Document'
};

export const STATUS_BADGE_CONFIG: Record<RTOCaseStatus, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-blue-500/15', text: 'text-blue-400 border-blue-500/30', label: 'New' },
  documents_pending: { bg: 'bg-amber-500/15', text: 'text-amber-400 border-amber-500/30', label: 'Docs Pending' },
  ready_to_submit: { bg: 'bg-indigo-500/15', text: 'text-indigo-400 border-indigo-500/30', label: 'Ready to Submit' },
  submitted_to_rto: { bg: 'bg-purple-500/15', text: 'text-purple-400 border-purple-500/30', label: 'Submitted to RTO' },
  under_process: { bg: 'bg-cyan-500/15', text: 'text-cyan-400 border-cyan-500/30', label: 'Under Process' },
  on_hold: { bg: 'bg-orange-500/15', text: 'text-orange-400 border-orange-500/30', label: 'On Hold' },
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400 border-emerald-500/30', label: 'Completed' },
  rejected: { bg: 'bg-rose-500/15', text: 'text-rose-400 border-rose-500/30', label: 'Rejected' },
  cancelled: { bg: 'bg-zinc-500/15', text: 'text-zinc-400 border-zinc-500/30', label: 'Cancelled' }
};

export function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}
