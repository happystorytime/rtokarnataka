import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Define data and uploads directories
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const UPLOADS_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
const BACKUPS_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'rto_records.db');

// Ensure directories exist
for (const dir of [DATA_DIR, UPLOADS_DIR, BACKUPS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Connect to SQLite Database
export const db = new Database(DB_PATH);

// Enforce foreign keys and WAL performance mode
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

/**
 * Initialize database tables, indexes, and constraints
 */
export function initializeDatabase() {
  const schema = `
    -- Single-User Administrator Authentication
    CREATE TABLE IF NOT EXISTS admin_auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL DEFAULT 'admin',
      password_hash TEXT NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Admin Active Sessions
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT
    );

    -- Showrooms (Multi-showroom management for dealer tie-ups)
    CREATE TABLE IF NOT EXISTS showrooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      branch TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT DEFAULT 'Bengaluru',
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- Clients
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      alt_phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT DEFAULT 'Bengaluru',
      pincode TEXT,
      notes TEXT,
      follow_up_date TEXT,
      follow_up_status TEXT DEFAULT 'pending',
      follow_up_notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- Vehicles (New, Used, Tractor, Exchange)
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      reg_number TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      variant TEXT,
      manufacturing_year INTEGER,
      chassis_number TEXT NOT NULL,
      engine_number TEXT NOT NULL,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      showroom_id TEXT REFERENCES showrooms(id) ON DELETE SET NULL,
      rc_status TEXT DEFAULT 'Issued',
      rc_issue_date TEXT,
      rc_valid_upto TEXT,
      insurance_provider TEXT,
      insurance_policy_no TEXT,
      insurance_expiry TEXT,
      fitness_valid_upto TEXT,
      permit_valid_upto TEXT,
      hypothecation_status TEXT DEFAULT 'none',
      financier_name TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- RTO Cases / Paperwork Tracking
    CREATE TABLE IF NOT EXISTS rto_cases (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      vehicle_id TEXT REFERENCES vehicles(id) ON DELETE RESTRICT,
      showroom_id TEXT REFERENCES showrooms(id) ON DELETE SET NULL,
      service_type TEXT NOT NULL,
      rto_office TEXT NOT NULL DEFAULT 'KA-01 (Koramangala)',
      rto_application_no TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      checklist TEXT NOT NULL DEFAULT '[]',
      opened_date TEXT NOT NULL,
      submission_date TEXT,
      due_date TEXT,
      completion_date TEXT,
      service_charge REAL NOT NULL DEFAULT 0,
      government_fee REAL NOT NULL DEFAULT 0,
      notes TEXT,
      receipt_details TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- Vehicle Exchanges (Old vehicle for new vehicle workflow)
    CREATE TABLE IF NOT EXISTS vehicle_exchanges (
      id TEXT PRIMARY KEY,
      exchange_number TEXT UNIQUE NOT NULL,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      old_vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
      new_vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
      showroom_id TEXT REFERENCES showrooms(id) ON DELETE SET NULL,
      valuation_amount REAL NOT NULL DEFAULT 0,
      agreed_exchange_amount REAL NOT NULL DEFAULT 0,
      loan_outstanding_amount REAL NOT NULL DEFAULT 0,
      hypothecation_settlement_status TEXT DEFAULT 'pending',
      transfer_paperwork_status TEXT DEFAULT 'pending',
      amount_received_from_client REAL NOT NULL DEFAULT 0,
      amount_paid_to_client REAL NOT NULL DEFAULT 0,
      net_difference REAL NOT NULL DEFAULT 0,
      exchange_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- Document Management (Stored securely on server disk)
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
      case_id TEXT REFERENCES rto_cases(id) ON DELETE SET NULL,
      showroom_id TEXT REFERENCES showrooms(id) ON DELETE SET NULL,
      exchange_id TEXT REFERENCES vehicle_exchanges(id) ON DELETE SET NULL,
      expiry_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- Payments & Financial Tracking
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT UNIQUE NOT NULL,
      payment_date TEXT NOT NULL,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      case_id TEXT REFERENCES rto_cases(id) ON DELETE SET NULL,
      showroom_id TEXT REFERENCES showrooms(id) ON DELETE SET NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_no TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- In-app Reminders & Follow-ups
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      snoozed_until TEXT,
      entity_type TEXT,
      entity_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Audit Activity Log
    CREATE TABLE IF NOT EXISTS audit_activity (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    -- Create Indexes for fast querying
    CREATE INDEX IF NOT EXISTS idx_clients_mobile ON clients(mobile);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(full_name);
    CREATE INDEX IF NOT EXISTS idx_vehicles_reg ON vehicles(reg_number);
    CREATE INDEX IF NOT EXISTS idx_vehicles_chassis ON vehicles(chassis_number);
    CREATE INDEX IF NOT EXISTS idx_vehicles_engine ON vehicles(engine_number);
    CREATE INDEX IF NOT EXISTS idx_vehicles_client ON vehicles(client_id);
    CREATE INDEX IF NOT EXISTS idx_cases_client ON rto_cases(client_id);
    CREATE INDEX IF NOT EXISTS idx_cases_vehicle ON rto_cases(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_cases_status ON rto_cases(status);
    CREATE INDEX IF NOT EXISTS idx_cases_due_date ON rto_cases(due_date);
    CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
    CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON documents(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(case_id);
    CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
    CREATE INDEX IF NOT EXISTS idx_payments_case ON payments(case_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_status_due ON reminders(status, due_date);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON audit_activity(created_at DESC);
  `;

  db.exec(schema);
}

/**
 * Log an audit activity entry
 */
export function logActivity(
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  metadata?: Record<string, any>
) {
  try {
    const id = 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const stmt = db.prepare(`
      INSERT INTO audit_activity (id, action, entity_type, entity_id, description, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      action,
      entityType,
      entityId,
      description,
      metadata ? JSON.stringify(metadata) : null,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Create a database backup file
 */
export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `rto_backup_${timestamp}.db`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

  await db.backup(backupFilePath);
  return backupFilePath;
}

export { DATA_DIR, UPLOADS_DIR, BACKUPS_DIR, DB_PATH };
