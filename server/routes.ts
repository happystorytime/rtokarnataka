import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, logActivity, createBackup, UPLOADS_DIR, BACKUPS_DIR } from './db.ts';
import {
  isInitialized,
  setupAdmin,
  authenticateAdmin,
  requireAuth,
  logoutAdmin,
  updatePassword
} from './auth.ts';
import type { AuthenticatedRequest } from './auth.ts';

export const apiRouter = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, uniqueName);
  }
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'image/heic',
  'image/heif'
];

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only PDF and images (JPG, PNG, WEBP) are allowed.'));
    }
  }
});

// Helper for generating custom IDs
function generateId(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const time = Date.now().toString().slice(-4);
  return `${prefix}-${year}-${time}${rand.toString().slice(-2)}`;
}

// ==========================================
// 1. HEALTH CHECK & AUTHENTICATION ENDPOINTS
// ==========================================

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Karnataka RTO Document Management System',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: 'connected'
  });
});

apiRouter.get('/auth/status', (req: Request, res: Response) => {
  const initialized = isInitialized();
  let authenticated = false;
  let username: string | undefined;

  const admin = db.prepare('SELECT username FROM admin_auth WHERE id = 1').get() as any;
  if (admin) {
    username = admin.username;
  }

  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);
  if (!token && req.query?.token) {
    token = String(req.query.token).trim();
  }

  if (token) {
    const session = db.prepare('SELECT * FROM admin_sessions WHERE token = ?').get(token) as any;
    if (session && new Date(session.expires_at) > new Date()) {
      authenticated = true;
    }
  }

  res.json({ initialized, authenticated, username });
});

apiRouter.get('/auth/setup', (_req: Request, res: Response) => {
  res.json({ initialized: isInitialized() });
});

apiRouter.post('/auth/setup', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (isInitialized()) {
    // If already initialized, seamlessly authenticate if credentials match
    const auth = await authenticateAdmin(username, password, req.ip, req.headers['user-agent']);
    if (auth.success) {
      return res.json({ success: true, token: auth.token });
    }
    return res.status(400).json({
      error: 'System administrator is already configured. Please use Unlock Dashboard with your administrator password.'
    });
  }

  const result = await setupAdmin(username, password);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Automatically log in after setup
  const auth = await authenticateAdmin(username, password, req.ip, req.headers['user-agent']);
  res.json({ success: true, token: auth.token });
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const auth = await authenticateAdmin(username, password, req.ip, req.headers['user-agent']);
  if (!auth.success) {
    return res.status(401).json({ error: auth.error });
  }

  res.json({ success: true, token: auth.token });
});

apiRouter.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.sessionToken) {
    logoutAdmin(req.sessionToken);
  }
  res.json({ success: true });
});

apiRouter.post('/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new passwords are required.' });
  }

  const result = await updatePassword(currentPassword, newPassword);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, message: 'Password successfully updated.' });
});

// ==========================================
// 2. DASHBOARD SUMMARY & AUDIT ACTIVITY
// ==========================================

apiRouter.get('/dashboard/stats', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const totalClients = db.prepare("SELECT COUNT(*) as count FROM clients WHERE deleted_at IS NULL").get() as any;
  const totalVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE deleted_at IS NULL").get() as any;
  const totalShowrooms = db.prepare("SELECT COUNT(*) as count FROM showrooms WHERE deleted_at IS NULL").get() as any;
  
  const openCases = db.prepare(`
    SELECT COUNT(*) as count FROM rto_cases 
    WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled', 'rejected')
  `).get() as any;

  const todayStr = new Date().toISOString().split('T')[0];
  
  const casesDueToday = db.prepare(`
    SELECT COUNT(*) as count FROM rto_cases 
    WHERE deleted_at IS NULL 
      AND status NOT IN ('completed', 'cancelled', 'rejected')
      AND due_date IS NOT NULL 
      AND due_date = ?
  `).get(todayStr) as any;

  const casesOverdue = db.prepare(`
    SELECT COUNT(*) as count FROM rto_cases 
    WHERE deleted_at IS NULL 
      AND status NOT IN ('completed', 'cancelled', 'rejected')
      AND due_date IS NOT NULL 
      AND due_date < ?
  `).get(todayStr) as any;

  // Documents or policies expiring in next 30 days
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const expiringVehiclesInsurance = db.prepare(`
    SELECT COUNT(*) as count FROM vehicles 
    WHERE deleted_at IS NULL 
      AND insurance_expiry IS NOT NULL 
      AND insurance_expiry <= ?
  `).get(in30Days) as any;

  const expiringVehiclesFitness = db.prepare(`
    SELECT COUNT(*) as count FROM vehicles 
    WHERE deleted_at IS NULL 
      AND fitness_valid_upto IS NOT NULL 
      AND fitness_valid_upto <= ?
  `).get(in30Days) as any;

  const expiringDocuments = db.prepare(`
    SELECT COUNT(*) as count FROM documents 
    WHERE deleted_at IS NULL 
      AND expiry_date IS NOT NULL 
      AND expiry_date <= ?
  `).get(in30Days) as any;

  // Outstanding client balances calculation
  // Total fees charged across all cases minus client payments received
  const totalCharges = db.prepare(`
    SELECT COALESCE(SUM(service_charge + government_fee), 0) as total 
    FROM rto_cases WHERE deleted_at IS NULL
  `).get() as any;

  const totalReceived = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM payments 
    WHERE deleted_at IS NULL AND category IN ('client_payment', 'advance')
  `).get() as any;

  const outstandingBalance = Math.max(0, (totalCharges.total || 0) - (totalReceived.total || 0));

  // Payments received this month
  const currentMonthStart = todayStr.substring(0, 7) + '-01';
  const paymentsThisMonth = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM payments 
    WHERE deleted_at IS NULL 
      AND category IN ('client_payment', 'advance')
      AND payment_date >= ?
  `).get(currentMonthStart) as any;

  // Recent activity log (searchable in dashboard)
  const recentActivity = db.prepare(`
    SELECT * FROM audit_activity 
    ORDER BY created_at DESC 
    LIMIT 25
  `).all();

  res.json({
    totalClients: totalClients.count || 0,
    totalVehicles: totalVehicles.count || 0,
    totalShowrooms: totalShowrooms.count || 0,
    openCases: openCases.count || 0,
    casesDueToday: casesDueToday.count || 0,
    casesOverdue: casesOverdue.count || 0,
    expiringDocumentsCount: (expiringVehiclesInsurance.count || 0) + (expiringVehiclesFitness.count || 0) + (expiringDocuments.count || 0),
    outstandingBalance: outstandingBalance,
    paymentsThisMonth: paymentsThisMonth.total || 0,
    recentActivity
  });
});

// ==========================================
// 3. SHOWROOM MANAGEMENT
// ==========================================

apiRouter.get('/showrooms', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = req.query.q ? `%${req.query.q}%` : '%';
  const showrooms = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM vehicles v WHERE v.showroom_id = s.id AND v.deleted_at IS NULL) as vehicle_count,
      (SELECT COUNT(*) FROM rto_cases c WHERE c.showroom_id = s.id AND c.deleted_at IS NULL) as case_count
    FROM showrooms s
    WHERE s.deleted_at IS NULL AND (s.name LIKE ? OR s.code LIKE ? OR s.branch LIKE ? OR s.city LIKE ?)
    ORDER BY s.created_at DESC
  `).all(query, query, query, query);

  res.json(showrooms);
});

apiRouter.post('/showrooms', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, code, branch, contact_person, phone, email, address, city, notes } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Showroom name is required.' });
  }

  const id = generateId('SHR');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO showrooms (id, name, code, branch, contact_person, phone, email, address, city, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);

  stmt.run(id, name.trim(), code?.trim() || null, branch?.trim() || null, contact_person?.trim() || null, phone?.trim() || null, email?.trim() || null, address?.trim() || null, city?.trim() || 'Bengaluru', notes?.trim() || null, now, now);

  logActivity('CREATE_SHOWROOM', 'SHOWROOM', id, `Created showroom: ${name}`);
  res.status(201).json({ id, message: 'Showroom created successfully.' });
});

apiRouter.put('/showrooms/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, code, branch, contact_person, phone, email, address, city, notes, status } = req.body;
  
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Showroom name is required.' });
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE showrooms 
    SET name = ?, code = ?, branch = ?, contact_person = ?, phone = ?, email = ?, address = ?, city = ?, notes = ?, status = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `);

  const info = stmt.run(name.trim(), code?.trim() || null, branch?.trim() || null, contact_person?.trim() || null, phone?.trim() || null, email?.trim() || null, address?.trim() || null, city?.trim() || 'Bengaluru', notes?.trim() || null, status || 'active', now, id);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Showroom not found.' });
  }

  logActivity('UPDATE_SHOWROOM', 'SHOWROOM', id, `Updated showroom: ${name}`);
  res.json({ message: 'Showroom updated successfully.' });
});

apiRouter.delete('/showrooms/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  const stmt = db.prepare('UPDATE showrooms SET deleted_at = ?, updated_at = ? WHERE id = ?');
  const info = stmt.run(now, now, id);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Showroom not found.' });
  }

  logActivity('DELETE_SHOWROOM', 'SHOWROOM', id, `Archived showroom ${id}`);
  res.json({ message: 'Showroom archived.' });
});

// ==========================================
// 4. CLIENT MANAGEMENT
// ==========================================

apiRouter.get('/clients', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = req.query.q ? `%${req.query.q}%` : '%';
  const statusFilter = req.query.status as string;

  let sql = `
    SELECT c.*,
      (SELECT COUNT(*) FROM vehicles v WHERE v.client_id = c.id AND v.deleted_at IS NULL) as vehicle_count,
      (SELECT COUNT(*) FROM rto_cases rc WHERE rc.client_id = c.id AND rc.deleted_at IS NULL) as case_count
    FROM clients c
    WHERE c.deleted_at IS NULL 
      AND (c.full_name LIKE ? OR c.mobile LIKE ? OR c.email LIKE ? OR c.city LIKE ?)
  `;

  const params: any[] = [query, query, query, query];
  if (statusFilter && statusFilter !== 'all') {
    sql += ` AND c.status = ?`;
    params.push(statusFilter);
  }

  sql += ` ORDER BY c.created_at DESC`;

  const clients = db.prepare(sql).all(...params);
  res.json(clients);
});

apiRouter.get('/clients/check-duplicate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const mobile = req.query.mobile as string;
  const excludeId = req.query.excludeId as string;

  if (!mobile || mobile.trim().length < 5) {
    return res.json({ duplicate: false });
  }

  let stmt = db.prepare('SELECT id, full_name, mobile FROM clients WHERE mobile = ? AND deleted_at IS NULL');
  if (excludeId) {
    stmt = db.prepare('SELECT id, full_name, mobile FROM clients WHERE mobile = ? AND id != ? AND deleted_at IS NULL');
  }

  const existing = excludeId ? stmt.get(mobile.trim(), excludeId) : stmt.get(mobile.trim());
  if (existing) {
    return res.json({ duplicate: true, client: existing });
  }

  res.json({ duplicate: false });
});

apiRouter.get('/clients/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND deleted_at IS NULL').get(id) as any;

  if (!client) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const vehicles = db.prepare('SELECT * FROM vehicles WHERE client_id = ? AND deleted_at IS NULL ORDER BY created_at DESC').all(id);
  const cases = db.prepare(`
    SELECT rc.*, v.reg_number as vehicle_reg, v.make as vehicle_make, v.model as vehicle_model 
    FROM rto_cases rc 
    LEFT JOIN vehicles v ON rc.vehicle_id = v.id 
    WHERE rc.client_id = ? AND rc.deleted_at IS NULL 
    ORDER BY rc.created_at DESC
  `).all(id);
  const payments = db.prepare('SELECT * FROM payments WHERE client_id = ? AND deleted_at IS NULL ORDER BY payment_date DESC').all(id);
  const documents = db.prepare('SELECT * FROM documents WHERE client_id = ? AND deleted_at IS NULL ORDER BY created_at DESC').all(id);
  const exchanges = db.prepare('SELECT * FROM vehicle_exchanges WHERE client_id = ? AND deleted_at IS NULL ORDER BY created_at DESC').all(id);

  res.json({
    ...client,
    vehicles,
    cases,
    payments,
    documents,
    exchanges
  });
});

apiRouter.post('/clients', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { full_name, mobile, alt_phone, email, address, city, pincode, notes, follow_up_date, follow_up_notes } = req.body;

  if (!full_name?.trim() || !mobile?.trim()) {
    return res.status(400).json({ error: 'Full name and mobile number are required.' });
  }

  const id = generateId('CLI');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO clients (id, full_name, mobile, alt_phone, email, address, city, pincode, notes, follow_up_date, follow_up_status, follow_up_notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'active', ?, ?)
  `);

  stmt.run(
    id,
    full_name.trim(),
    mobile.trim(),
    alt_phone?.trim() || null,
    email?.trim() || null,
    address?.trim() || null,
    city?.trim() || 'Bengaluru',
    pincode?.trim() || null,
    notes?.trim() || null,
    follow_up_date || null,
    follow_up_notes?.trim() || null,
    now,
    now
  );

  // If follow-up date was set, insert reminder
  if (follow_up_date) {
    const remId = generateId('REM');
    db.prepare(`
      INSERT INTO reminders (id, type, title, description, due_date, status, entity_type, entity_id, created_at, updated_at)
      VALUES (?, 'follow_up', ?, ?, ?, 'pending', 'client', ?, ?, ?)
    `).run(
      remId,
      `Client Follow-up: ${full_name}`,
      follow_up_notes || `Follow up with client ${full_name} (${mobile})`,
      follow_up_date,
      id,
      now,
      now
    );
  }

  logActivity('CREATE_CLIENT', 'CLIENT', id, `Created client: ${full_name} (${mobile})`);
  res.status(201).json({ id, message: 'Client created successfully.' });
});

apiRouter.put('/clients/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { full_name, mobile, alt_phone, email, address, city, pincode, notes, follow_up_date, follow_up_status, follow_up_notes, status } = req.body;

  if (!full_name?.trim() || !mobile?.trim()) {
    return res.status(400).json({ error: 'Full name and mobile number are required.' });
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE clients 
    SET full_name = ?, mobile = ?, alt_phone = ?, email = ?, address = ?, city = ?, pincode = ?, notes = ?, 
        follow_up_date = ?, follow_up_status = ?, follow_up_notes = ?, status = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `);

  const info = stmt.run(
    full_name.trim(),
    mobile.trim(),
    alt_phone?.trim() || null,
    email?.trim() || null,
    address?.trim() || null,
    city?.trim() || 'Bengaluru',
    pincode?.trim() || null,
    notes?.trim() || null,
    follow_up_date || null,
    follow_up_status || 'pending',
    follow_up_notes?.trim() || null,
    status || 'active',
    now,
    id
  );

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  logActivity('UPDATE_CLIENT', 'CLIENT', id, `Updated client: ${full_name}`);
  res.json({ message: 'Client updated successfully.' });
});

apiRouter.delete('/clients/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  const stmt = db.prepare('UPDATE clients SET deleted_at = ?, updated_at = ? WHERE id = ?');
  const info = stmt.run(now, now, id);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  logActivity('ARCHIVE_CLIENT', 'CLIENT', id, `Archived client ${id}`);
  res.json({ message: 'Client archived.' });
});

// ==========================================
// 5. VEHICLE MANAGEMENT
// ==========================================

apiRouter.get('/vehicles', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = req.query.q ? `%${req.query.q}%` : '%';
  const category = req.query.category as string;
  const showroomId = req.query.showroomId as string;

  let sql = `
    SELECT v.*, 
      c.full_name as client_name, c.mobile as client_mobile,
      s.name as showroom_name, s.branch as showroom_branch
    FROM vehicles v
    LEFT JOIN clients c ON v.client_id = c.id
    LEFT JOIN showrooms s ON v.showroom_id = s.id
    WHERE v.deleted_at IS NULL 
      AND (v.reg_number LIKE ? OR v.chassis_number LIKE ? OR v.engine_number LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR c.full_name LIKE ?)
  `;

  const params: any[] = [query, query, query, query, query, query];

  if (category && category !== 'all') {
    sql += ` AND v.category = ?`;
    params.push(category);
  }

  if (showroomId && showroomId !== 'all') {
    sql += ` AND v.showroom_id = ?`;
    params.push(showroomId);
  }

  sql += ` ORDER BY v.created_at DESC`;

  const vehicles = db.prepare(sql).all(...params);
  res.json(vehicles);
});

apiRouter.get('/vehicles/check-duplicate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const chassis = req.query.chassis as string;
  const reg = req.query.reg as string;
  const excludeId = req.query.excludeId as string;

  if (chassis && chassis.trim().length > 4) {
    const existing = db.prepare(`
      SELECT id, reg_number, make, model, chassis_number 
      FROM vehicles 
      WHERE chassis_number = ? AND id != ? AND deleted_at IS NULL
    `).get(chassis.trim(), excludeId || '') as any;

    if (existing) {
      return res.json({ duplicate: true, field: 'chassis', vehicle: existing });
    }
  }

  if (reg && reg.trim().length > 4 && reg.trim().toLowerCase() !== 'not yet registered') {
    const existing = db.prepare(`
      SELECT id, reg_number, make, model, chassis_number 
      FROM vehicles 
      WHERE LOWER(reg_number) = LOWER(?) AND id != ? AND deleted_at IS NULL
    `).get(reg.trim(), excludeId || '') as any;

    if (existing) {
      return res.json({ duplicate: true, field: 'registration', vehicle: existing });
    }
  }

  res.json({ duplicate: false });
});

apiRouter.get('/vehicles/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const vehicle = db.prepare(`
    SELECT v.*, 
      c.full_name as client_name, c.mobile as client_mobile, c.address as client_address,
      s.name as showroom_name, s.branch as showroom_branch
    FROM vehicles v
    LEFT JOIN clients c ON v.client_id = c.id
    LEFT JOIN showrooms s ON v.showroom_id = s.id
    WHERE v.id = ? AND v.deleted_at IS NULL
  `).get(id) as any;

  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found.' });
  }

  const cases = db.prepare(`
    SELECT * FROM rto_cases WHERE vehicle_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
  `).all(id);

  const documents = db.prepare(`
    SELECT * FROM documents WHERE vehicle_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
  `).all(id);

  res.json({
    ...vehicle,
    cases,
    documents
  });
});

apiRouter.post('/vehicles', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    category,
    reg_number,
    make,
    model,
    variant,
    manufacturing_year,
    chassis_number,
    engine_number,
    client_id,
    showroom_id,
    rc_status,
    rc_issue_date,
    rc_valid_upto,
    insurance_provider,
    insurance_policy_no,
    insurance_expiry,
    fitness_valid_upto,
    permit_valid_upto,
    hypothecation_status,
    financier_name,
    notes
  } = req.body;

  if (!category || !make?.trim() || !model?.trim() || !chassis_number?.trim() || !engine_number?.trim()) {
    return res.status(400).json({ error: 'Category, Make, Model, Chassis number, and Engine number are required.' });
  }

  const id = generateId('VEH');
  const now = new Date().toISOString();
  const regClean = reg_number?.trim() || 'Not yet registered';

  const stmt = db.prepare(`
    INSERT INTO vehicles (
      id, category, reg_number, make, model, variant, manufacturing_year,
      chassis_number, engine_number, client_id, showroom_id,
      rc_status, rc_issue_date, rc_valid_upto,
      insurance_provider, insurance_policy_no, insurance_expiry,
      fitness_valid_upto, permit_valid_upto, hypothecation_status, financier_name,
      notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);

  stmt.run(
    id,
    category,
    regClean,
    make.trim(),
    model.trim(),
    variant?.trim() || null,
    manufacturing_year ? Number(manufacturing_year) : null,
    chassis_number.trim(),
    engine_number.trim(),
    client_id || null,
    showroom_id || null,
    rc_status || 'Issued',
    rc_issue_date || null,
    rc_valid_upto || null,
    insurance_provider?.trim() || null,
    insurance_policy_no?.trim() || null,
    insurance_expiry || null,
    fitness_valid_upto || null,
    permit_valid_upto || null,
    hypothecation_status || 'none',
    financier_name?.trim() || null,
    notes?.trim() || null,
    now,
    now
  );

  // Auto-schedule reminders if expiry dates provided
  if (insurance_expiry) {
    const remId = generateId('REM');
    db.prepare(`
      INSERT INTO reminders (id, type, title, description, due_date, status, entity_type, entity_id, created_at, updated_at)
      VALUES (?, 'document_expiry', ?, ?, ?, 'pending', 'vehicle', ?, ?, ?)
    `).run(
      remId,
      `Insurance Expiry: ${make} ${model} (${regClean})`,
      `Policy #${insurance_policy_no || 'N/A'} with ${insurance_provider || 'Provider'} expires on ${insurance_expiry}`,
      insurance_expiry,
      id,
      now,
      now
    );
  }

  if (fitness_valid_upto) {
    const remId = generateId('REM');
    db.prepare(`
      INSERT INTO reminders (id, type, title, description, due_date, status, entity_type, entity_id, created_at, updated_at)
      VALUES (?, 'document_expiry', ?, ?, ?, 'pending', 'vehicle', ?, ?, ?)
    `).run(
      remId,
      `Fitness Certificate Expiry: ${make} ${model} (${regClean})`,
      `Vehicle fitness expires on ${fitness_valid_upto}`,
      fitness_valid_upto,
      id,
      now,
      now
    );
  }

  logActivity('CREATE_VEHICLE', 'VEHICLE', id, `Added vehicle ${make} ${model} (${regClean})`);
  res.status(201).json({ id, message: 'Vehicle added successfully.' });
});

apiRouter.put('/vehicles/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    category,
    reg_number,
    make,
    model,
    variant,
    manufacturing_year,
    chassis_number,
    engine_number,
    client_id,
    showroom_id,
    rc_status,
    rc_issue_date,
    rc_valid_upto,
    insurance_provider,
    insurance_policy_no,
    insurance_expiry,
    fitness_valid_upto,
    permit_valid_upto,
    hypothecation_status,
    financier_name,
    notes,
    status
  } = req.body;

  if (!category || !make?.trim() || !model?.trim() || !chassis_number?.trim() || !engine_number?.trim()) {
    return res.status(400).json({ error: 'Category, Make, Model, Chassis number, and Engine number are required.' });
  }

  const now = new Date().toISOString();
  const regClean = reg_number?.trim() || 'Not yet registered';

  const stmt = db.prepare(`
    UPDATE vehicles 
    SET category = ?, reg_number = ?, make = ?, model = ?, variant = ?, manufacturing_year = ?,
        chassis_number = ?, engine_number = ?, client_id = ?, showroom_id = ?,
        rc_status = ?, rc_issue_date = ?, rc_valid_upto = ?,
        insurance_provider = ?, insurance_policy_no = ?, insurance_expiry = ?,
        fitness_valid_upto = ?, permit_valid_upto = ?, hypothecation_status = ?, financier_name = ?,
        notes = ?, status = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `);

  const info = stmt.run(
    category,
    regClean,
    make.trim(),
    model.trim(),
    variant?.trim() || null,
    manufacturing_year ? Number(manufacturing_year) : null,
    chassis_number.trim(),
    engine_number.trim(),
    client_id || null,
    showroom_id || null,
    rc_status || 'Issued',
    rc_issue_date || null,
    rc_valid_upto || null,
    insurance_provider?.trim() || null,
    insurance_policy_no?.trim() || null,
    insurance_expiry || null,
    fitness_valid_upto || null,
    permit_valid_upto || null,
    hypothecation_status || 'none',
    financier_name?.trim() || null,
    notes?.trim() || null,
    status || 'active',
    now,
    id
  );

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Vehicle not found.' });
  }

  logActivity('UPDATE_VEHICLE', 'VEHICLE', id, `Updated vehicle ${make} ${model} (${regClean})`);
  res.json({ message: 'Vehicle updated successfully.' });
});

apiRouter.delete('/vehicles/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  const stmt = db.prepare('UPDATE vehicles SET deleted_at = ?, updated_at = ? WHERE id = ?');
  const info = stmt.run(now, now, id);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Vehicle not found.' });
  }

  logActivity('ARCHIVE_VEHICLE', 'VEHICLE', id, `Archived vehicle ${id}`);
  res.json({ message: 'Vehicle archived.' });
});

// ==========================================
// 6. RTO CASE / PAPERWORK TRACKING
// ==========================================

// Pre-defined document checklists for Karnataka RTO Services
const DEFAULT_CHECKLISTS: Record<string, string[]> = {
  new_registration: [
    'Form 20 (Application for Registration)',
    'Form 21 (Sale Certificate from Showroom)',
    'Form 22 (Road Worthiness Certificate)',
    'Valid Insurance Certificate',
    'Owner Aadhaar / Address Proof (Karnataka)',
    'Showroom Commercial Tax Invoice',
    'Chassis Pencil Print on Form 20',
    'Temporary Registration / Entry Tax Receipt'
  ],
  ownership_transfer: [
    'Form 29 (Notice of Transfer - 2 copies)',
    'Form 30 (Report of Transfer - 2 copies)',
    'Original RC Book / Smart Card',
    'Valid Insurance Certificate',
    'Valid PUC / Emission Certificate',
    'Buyer Aadhaar & Address Proof',
    'Seller Signature ID Proof',
    'Chassis Pencil Impression'
  ],
  noc: [
    'Form 28 (Application for NOC - 3 copies)',
    'Original RC Book / Smart Card',
    'Valid Insurance Copy',
    'Valid Emission Certificate (PUC)',
    'Police Clearance Certificate (NCRB)',
    'Up-to-date Road Tax Clearance Receipt',
    'Chassis Pencil Impression'
  ],
  hypothecation_termination: [
    'Form 35 (in duplicate signed with Bank Seal)',
    'Original RC Book / Smart Card',
    'Bank NOC / Loan Foreclosure Clearance Letter',
    'Valid Insurance Certificate',
    'Valid PUC / Emission Certificate'
  ],
  rc_renewal: [
    'Form 25 (Application for Renewal of RC)',
    'Original RC Book',
    'Vehicle Physical Fitness Inspection (RTO Track)',
    'Valid Insurance Certificate',
    'Valid PUC / Emission Certificate',
    'Green Tax / Road Tax Payment Receipt',
    'Chassis Pencil Impression'
  ],
  duplicate_rc: [
    'Form 26 (Application for Duplicate RC)',
    'Police Lost Document Report (e-Lost / NCR Copy)',
    'Valid Insurance Certificate',
    'Valid PUC / Emission Certificate',
    'Owner Identity & Address Proof (Aadhaar)'
  ],
  insurance_renewal: [
    'Previous Year Insurance Policy Copy',
    'Vehicle RC Copy',
    'Owner Contact & Email',
    'Inspection / Survey Photos (if policy lapsed)'
  ],
  fitness_permit: [
    'Form 38 (Inspection Report)',
    'Commercial Permit Form (Form 47)',
    'Speed Governor Certificate',
    'Reflective Tape Certificate',
    'Valid Tax Payment Token',
    'Valid Insurance Certificate'
  ],
  address_change: [
    'Form 33 (Intimation of Change of Address)',
    'Original RC Book / Smart Card',
    'New Address Proof (Electricity bill / Aadhaar / Rent Agreement)',
    'Valid Insurance Certificate',
    'Valid PUC Certificate'
  ],
  other: [
    'Application Letter / Representation',
    'Vehicle RC Copy',
    'Supporting Identification Proof',
    'Fee Receipt'
  ]
};

apiRouter.get('/cases', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = req.query.q ? `%${req.query.q}%` : '%';
  const status = req.query.status as string;
  const serviceType = req.query.serviceType as string;
  const clientId = req.query.clientId as string;

  let sql = `
    SELECT rc.*,
      c.full_name as client_name, c.mobile as client_mobile,
      v.reg_number as vehicle_reg, v.make as vehicle_make, v.model as vehicle_model,
      s.name as showroom_name,
      (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.case_id = rc.id AND p.deleted_at IS NULL AND p.category IN ('client_payment', 'advance')) as amount_received
    FROM rto_cases rc
    LEFT JOIN clients c ON rc.client_id = c.id
    LEFT JOIN vehicles v ON rc.vehicle_id = v.id
    LEFT JOIN showrooms s ON rc.showroom_id = s.id
    WHERE rc.deleted_at IS NULL 
      AND (rc.case_number LIKE ? OR rc.rto_application_no LIKE ? OR c.full_name LIKE ? OR c.mobile LIKE ? OR v.reg_number LIKE ?)
  `;

  const params: any[] = [query, query, query, query, query];

  if (status && status !== 'all') {
    sql += ` AND rc.status = ?`;
    params.push(status);
  }

  if (serviceType && serviceType !== 'all') {
    sql += ` AND rc.service_type = ?`;
    params.push(serviceType);
  }

  if (clientId && clientId !== 'all') {
    sql += ` AND rc.client_id = ?`;
    params.push(clientId);
  }

  sql += ` ORDER BY rc.created_at DESC`;

  const cases = db.prepare(sql).all(...params).map((c: any) => {
    let checklist = [];
    try {
      checklist = JSON.parse(c.checklist || '[]');
    } catch {
      checklist = [];
    }
    const totalFees = (c.service_charge || 0) + (c.government_fee || 0);
    const balance = Math.max(0, totalFees - (c.amount_received || 0));

    return {
      ...c,
      checklist,
      total_fees: totalFees,
      balance
    };
  });

  res.json(cases);
});

apiRouter.get('/cases/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const rc = db.prepare(`
    SELECT rc.*,
      c.full_name as client_name, c.mobile as client_mobile, c.address as client_address,
      v.reg_number as vehicle_reg, v.make as vehicle_make, v.model as vehicle_model, v.chassis_number, v.engine_number,
      s.name as showroom_name
    FROM rto_cases rc
    LEFT JOIN clients c ON rc.client_id = c.id
    LEFT JOIN vehicles v ON rc.vehicle_id = v.id
    LEFT JOIN showrooms s ON rc.showroom_id = s.id
    WHERE rc.id = ? AND rc.deleted_at IS NULL
  `).get(id) as any;

  if (!rc) {
    return res.status(404).json({ error: 'RTO Case not found.' });
  }

  const payments = db.prepare(`
    SELECT * FROM payments WHERE case_id = ? AND deleted_at IS NULL ORDER BY payment_date DESC
  `).all(id);

  const documents = db.prepare(`
    SELECT * FROM documents WHERE case_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
  `).all(id);

  let checklist = [];
  try {
    checklist = JSON.parse(rc.checklist || '[]');
  } catch {
    checklist = [];
  }

  const receivedPayments = payments
    .filter((p: any) => p.category === 'client_payment' || p.category === 'advance')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const totalFees = (rc.service_charge || 0) + (rc.government_fee || 0);
  const balance = Math.max(0, totalFees - receivedPayments);

  res.json({
    ...rc,
    checklist,
    amount_received: receivedPayments,
    total_fees: totalFees,
    balance,
    payments,
    documents
  });
});

apiRouter.post('/cases', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    client_id,
    vehicle_id,
    showroom_id,
    service_type,
    rto_office,
    rto_application_no,
    status,
    checklist,
    opened_date,
    submission_date,
    due_date,
    completion_date,
    service_charge,
    government_fee,
    notes,
    receipt_details
  } = req.body;

  if (!client_id || !service_type) {
    return res.status(400).json({ error: 'Client and Service Type are required.' });
  }

  const id = generateId('RTO');
  const now = new Date().toISOString();
  const caseNumber = `KA-${service_type.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;

  // Build default checklist if not provided
  let initialChecklist = checklist;
  if (!initialChecklist || !Array.isArray(initialChecklist) || initialChecklist.length === 0) {
    const defaultItems = DEFAULT_CHECKLISTS[service_type] || DEFAULT_CHECKLISTS['other'];
    initialChecklist = defaultItems.map((item, index) => ({
      id: `chk_${index + 1}`,
      name: item,
      required: true,
      submitted: false,
      verified: false,
      notes: ''
    }));
  }

  const stmt = db.prepare(`
    INSERT INTO rto_cases (
      id, case_number, client_id, vehicle_id, showroom_id, service_type,
      rto_office, rto_application_no, status, checklist,
      opened_date, submission_date, due_date, completion_date,
      service_charge, government_fee, notes, receipt_details,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    caseNumber,
    client_id,
    vehicle_id || null,
    showroom_id || null,
    service_type,
    rto_office?.trim() || 'KA-01 (Koramangala)',
    rto_application_no?.trim() || null,
    status || 'new',
    JSON.stringify(initialChecklist),
    opened_date || now.split('T')[0],
    submission_date || null,
    due_date || null,
    completion_date || null,
    service_charge ? Number(service_charge) : 0,
    government_fee ? Number(government_fee) : 0,
    notes?.trim() || null,
    receipt_details?.trim() || null,
    now,
    now
  );

  // If due date was set, insert reminder
  if (due_date) {
    const remId = generateId('REM');
    db.prepare(`
      INSERT INTO reminders (id, type, title, description, due_date, status, entity_type, entity_id, created_at, updated_at)
      VALUES (?, 'case_due', ?, ?, ?, 'pending', 'case', ?, ?, ?)
    `).run(
      remId,
      `RTO Case Due: ${caseNumber} (${service_type.replace(/_/g, ' ')})`,
      `RTO paperwork case #${caseNumber} is due at ${rto_office || 'RTO'}`,
      due_date,
      id,
      now,
      now
    );
  }

  logActivity('CREATE_CASE', 'CASE', id, `Opened RTO case ${caseNumber} (${service_type})`);
  res.status(201).json({ id, case_number: caseNumber, message: 'RTO Case created successfully.' });
});

apiRouter.put('/cases/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    client_id,
    vehicle_id,
    showroom_id,
    service_type,
    rto_office,
    rto_application_no,
    status,
    checklist,
    opened_date,
    submission_date,
    due_date,
    completion_date,
    service_charge,
    government_fee,
    notes,
    receipt_details
  } = req.body;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE rto_cases 
    SET client_id = ?, vehicle_id = ?, showroom_id = ?, service_type = ?,
        rto_office = ?, rto_application_no = ?, status = ?, checklist = ?,
        opened_date = ?, submission_date = ?, due_date = ?, completion_date = ?,
        service_charge = ?, government_fee = ?, notes = ?, receipt_details = ?,
        updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `);

  const info = stmt.run(
    client_id,
    vehicle_id || null,
    showroom_id || null,
    service_type,
    rto_office || 'KA-01 (Koramangala)',
    rto_application_no?.trim() || null,
    status || 'new',
    typeof checklist === 'string' ? checklist : JSON.stringify(checklist || []),
    opened_date,
    submission_date || null,
    due_date || null,
    completion_date || null,
    service_charge !== undefined ? Number(service_charge) : 0,
    government_fee !== undefined ? Number(government_fee) : 0,
    notes?.trim() || null,
    receipt_details?.trim() || null,
    now,
    id
  );

  if (info.changes === 0) {
    return res.status(404).json({ error: 'RTO Case not found.' });
  }

  logActivity('UPDATE_CASE', 'CASE', id, `Updated RTO case ${id} status: ${status}`);
  res.json({ message: 'RTO Case updated successfully.' });
});

apiRouter.delete('/cases/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  const stmt = db.prepare('UPDATE rto_cases SET deleted_at = ?, updated_at = ? WHERE id = ?');
  const info = stmt.run(now, now, id);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Case not found.' });
  }

  logActivity('ARCHIVE_CASE', 'CASE', id, `Archived RTO case ${id}`);
  res.json({ message: 'Case archived.' });
});

// ==========================================
// 7. VEHICLE EXCHANGE WORKFLOW
// ==========================================

apiRouter.get('/exchanges', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const exchanges = db.prepare(`
    SELECT e.*,
      c.full_name as client_name, c.mobile as client_mobile,
      ov.reg_number as old_vehicle_reg, ov.make as old_vehicle_make, ov.model as old_vehicle_model,
      nv.reg_number as new_vehicle_reg, nv.make as new_vehicle_make, nv.model as new_vehicle_model,
      s.name as showroom_name
    FROM vehicle_exchanges e
    LEFT JOIN clients c ON e.client_id = c.id
    LEFT JOIN vehicles ov ON e.old_vehicle_id = ov.id
    LEFT JOIN vehicles nv ON e.new_vehicle_id = nv.id
    LEFT JOIN showrooms s ON e.showroom_id = s.id
    WHERE e.deleted_at IS NULL
    ORDER BY e.created_at DESC
  `).all();

  res.json(exchanges);
});

apiRouter.post('/exchanges', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    client_id,
    old_vehicle_id,
    new_vehicle_id,
    showroom_id,
    valuation_amount,
    agreed_exchange_amount,
    loan_outstanding_amount,
    hypothecation_settlement_status,
    transfer_paperwork_status,
    amount_received_from_client,
    amount_paid_to_client,
    exchange_date,
    notes
  } = req.body;

  if (!client_id || !old_vehicle_id || !new_vehicle_id) {
    return res.status(400).json({ error: 'Client, Old Vehicle, and New Vehicle are required.' });
  }

  const id = generateId('EXC');
  const exchangeNumber = `EXC-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const agreed = Number(agreed_exchange_amount || 0);
  const loan = Number(loan_outstanding_amount || 0);
  const netDiff = agreed - loan; // Equity from old vehicle

  const stmt = db.prepare(`
    INSERT INTO vehicle_exchanges (
      id, exchange_number, client_id, old_vehicle_id, new_vehicle_id, showroom_id,
      valuation_amount, agreed_exchange_amount, loan_outstanding_amount,
      hypothecation_settlement_status, transfer_paperwork_status,
      amount_received_from_client, amount_paid_to_client, net_difference,
      exchange_date, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    exchangeNumber,
    client_id,
    old_vehicle_id,
    new_vehicle_id,
    showroom_id || null,
    valuation_amount ? Number(valuation_amount) : 0,
    agreed,
    loan,
    hypothecation_settlement_status || 'pending',
    transfer_paperwork_status || 'pending',
    amount_received_from_client ? Number(amount_received_from_client) : 0,
    amount_paid_to_client ? Number(amount_paid_to_client) : 0,
    netDiff,
    exchange_date || now.split('T')[0],
    notes?.trim() || null,
    now,
    now
  );

  logActivity('CREATE_EXCHANGE', 'EXCHANGE', id, `Created vehicle exchange ${exchangeNumber}`);
  res.status(201).json({ id, exchange_number: exchangeNumber, message: 'Exchange record created successfully.' });
});

apiRouter.delete('/exchanges/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  const stmt = db.prepare('UPDATE vehicle_exchanges SET deleted_at = ?, updated_at = ? WHERE id = ?');
  const info = stmt.run(now, now, id);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Exchange not found.' });
  }

  logActivity('ARCHIVE_EXCHANGE', 'EXCHANGE', id, `Archived vehicle exchange ${id}`);
  res.json({ message: 'Exchange archived.' });
});

// ==========================================
// 8. DOCUMENT MANAGEMENT (PRIVATE STORAGE)
// ==========================================

apiRouter.get('/documents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = req.query.q ? `%${req.query.q}%` : '%';
  const category = req.query.category as string;
  const clientId = req.query.clientId as string;
  const vehicleId = req.query.vehicleId as string;
  const caseId = req.query.caseId as string;

  let sql = `
    SELECT d.*,
      c.full_name as client_name, c.mobile as client_mobile,
      v.reg_number as vehicle_reg, v.make as vehicle_make, v.model as vehicle_model,
      rc.case_number
    FROM documents d
    LEFT JOIN clients c ON d.client_id = c.id
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    LEFT JOIN rto_cases rc ON d.case_id = rc.id
    WHERE d.deleted_at IS NULL 
      AND (d.title LIKE ? OR d.original_name LIKE ? OR c.full_name LIKE ? OR v.reg_number LIKE ?)
  `;

  const params: any[] = [query, query, query, query];

  if (category && category !== 'all') {
    sql += ` AND d.category = ?`;
    params.push(category);
  }
  if (clientId) {
    sql += ` AND d.client_id = ?`;
    params.push(clientId);
  }
  if (vehicleId) {
    sql += ` AND d.vehicle_id = ?`;
    params.push(vehicleId);
  }
  if (caseId) {
    sql += ` AND d.case_id = ?`;
    params.push(caseId);
  }

  sql += ` ORDER BY d.created_at DESC`;

  const docs = db.prepare(sql).all(...params);
  res.json(docs);
});

apiRouter.post('/documents/upload', requireAuth, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document file uploaded.' });
  }

  const { title, category, client_id, vehicle_id, case_id, showroom_id, exchange_id, expiry_date, notes } = req.body;

  if (!title?.trim() || !category) {
    // Remove uploaded file if validation fails
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Document title and category are required.' });
  }

  const id = generateId('DOC');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO documents (
      id, title, category, file_name, original_name, file_path, file_size, mime_type,
      client_id, vehicle_id, case_id, showroom_id, exchange_id, expiry_date, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    title.trim(),
    category,
    req.file.filename,
    req.file.originalname,
    req.file.path,
    req.file.size,
    req.file.mimetype,
    client_id || null,
    vehicle_id || null,
    case_id || null,
    showroom_id || null,
    exchange_id || null,
    expiry_date || null,
    notes?.trim() || null,
    now,
    now
  );

  // If expiry date is configured, create reminder
  if (expiry_date) {
    const remId = generateId('REM');
    db.prepare(`
      INSERT INTO reminders (id, type, title, description, due_date, status, entity_type, entity_id, created_at, updated_at)
      VALUES (?, 'document_expiry', ?, ?, ?, 'pending', 'document', ?, ?, ?)
    `).run(
      remId,
      `Document Expiring: ${title}`,
      `Document "${title}" (${category}) is scheduled to expire on ${expiry_date}`,
      expiry_date,
      id,
      now,
      now
    );
  }

  logActivity('UPLOAD_DOCUMENT', 'DOCUMENT', id, `Uploaded document: ${title} (${req.file.originalname})`);
  res.status(201).json({ id, message: 'Document uploaded successfully.' });
});

// Secure authenticated document preview & download
apiRouter.get('/documents/:id/file', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;

  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  let filePath = path.resolve(doc.file_path);

  // Verify file exists on disk, with fallback to UPLOADS_DIR
  if (!fs.existsSync(filePath)) {
    const fallback = path.join(UPLOADS_DIR, doc.file_name);
    if (fs.existsSync(fallback)) {
      filePath = fallback;
    } else {
      return res.status(404).json({ error: 'Document file missing from server storage.' });
    }
  }

  res.setHeader('Content-Type', doc.mime_type);
  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_name)}"`);
  } else {
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_name)}"`);
  }

  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

apiRouter.delete('/documents/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  // Soft delete in database
  db.prepare('UPDATE documents SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);

  logActivity('ARCHIVE_DOCUMENT', 'DOCUMENT', id, `Archived document: ${doc.title}`);
  res.json({ message: 'Document archived.' });
});

// ==========================================
// 9. PAYMENTS & FINANCIAL TRACKING
// ==========================================

apiRouter.get('/payments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = req.query.q ? `%${req.query.q}%` : '%';
  const category = req.query.category as string;
  const paymentMethod = req.query.paymentMethod as string;
  const clientId = req.query.clientId as string;

  let sql = `
    SELECT p.*,
      c.full_name as client_name, c.mobile as client_mobile,
      rc.case_number, rc.service_type,
      s.name as showroom_name
    FROM payments p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN rto_cases rc ON p.case_id = rc.id
    LEFT JOIN showrooms s ON p.showroom_id = s.id
    WHERE p.deleted_at IS NULL 
      AND (p.payment_number LIKE ? OR p.reference_no LIKE ? OR c.full_name LIKE ? OR c.mobile LIKE ?)
  `;

  const params: any[] = [query, query, query, query];

  if (category && category !== 'all') {
    sql += ` AND p.category = ?`;
    params.push(category);
  }
  if (paymentMethod && paymentMethod !== 'all') {
    sql += ` AND p.payment_method = ?`;
    params.push(paymentMethod);
  }
  if (clientId) {
    sql += ` AND p.client_id = ?`;
    params.push(clientId);
  }

  sql += ` ORDER BY p.payment_date DESC, p.created_at DESC`;

  const payments = db.prepare(sql).all(...params);
  res.json(payments);
});

apiRouter.get('/payments/summary', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  // Aggregate stats
  const totalServiceCharges = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments 
    WHERE deleted_at IS NULL AND category = 'service_charge'
  `).get() as any;

  const totalGovernmentFees = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments 
    WHERE deleted_at IS NULL AND category = 'government_fee'
  `).get() as any;

  const totalClientPayments = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments 
    WHERE deleted_at IS NULL AND category IN ('client_payment', 'advance')
  `).get() as any;

  const totalRefunds = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments 
    WHERE deleted_at IS NULL AND category = 'refund'
  `).get() as any;

  const totalBilled = db.prepare(`
    SELECT COALESCE(SUM(service_charge + government_fee), 0) as total 
    FROM rto_cases WHERE deleted_at IS NULL
  `).get() as any;

  const outstanding = Math.max(0, (totalBilled.total || 0) - (totalClientPayments.total || 0) + (totalRefunds.total || 0));

  res.json({
    totalBilled: totalBilled.total || 0,
    totalServiceCharges: totalServiceCharges.total || 0,
    totalGovernmentFees: totalGovernmentFees.total || 0,
    totalClientPayments: totalClientPayments.total || 0,
    totalRefunds: totalRefunds.total || 0,
    outstanding
  });
});

apiRouter.get('/payments/export-csv', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const payments = db.prepare(`
    SELECT p.payment_number, p.payment_date, c.full_name as client_name, c.mobile as client_mobile,
           rc.case_number, p.category, p.amount, p.payment_method, p.reference_no, p.notes
    FROM payments p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN rto_cases rc ON p.case_id = rc.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.payment_date DESC
  `).all() as any[];

  let csv = 'Payment Number,Date,Client Name,Mobile,Case Number,Category,Amount (INR),Payment Method,Reference / UTR,Notes\n';

  for (const row of payments) {
    const cleanNotes = (row.notes || '').replace(/"/g, '""');
    csv += `"${row.payment_number}","${row.payment_date}","${row.client_name}","${row.client_mobile}","${row.case_number || ''}","${row.category}","${row.amount}","${row.payment_method}","${row.reference_no || ''}","${cleanNotes}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rto_payments_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

apiRouter.post('/payments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { client_id, case_id, showroom_id, category, amount, payment_method, reference_no, payment_date, notes } = req.body;

  if (!client_id || !category || !amount || Number(amount) <= 0 || !payment_method) {
    return res.status(400).json({ error: 'Client, Category, valid positive Amount, and Payment Method are required.' });
  }

  const id = generateId('PAY');
  const paymentNumber = `RCP-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO payments (
      id, payment_number, payment_date, client_id, case_id, showroom_id,
      category, amount, payment_method, reference_no, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    paymentNumber,
    payment_date || now.split('T')[0],
    client_id,
    case_id || null,
    showroom_id || null,
    category,
    Number(amount),
    payment_method,
    reference_no?.trim() || null,
    notes?.trim() || null,
    now,
    now
  );

  logActivity('RECORD_PAYMENT', 'PAYMENT', id, `Recorded payment ₹${amount} (${category}) for client ${client_id}`);
  res.status(201).json({ id, payment_number: paymentNumber, message: 'Payment recorded successfully.' });
});

apiRouter.delete('/payments/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  const stmt = db.prepare('UPDATE payments SET deleted_at = ?, updated_at = ? WHERE id = ?');
  const info = stmt.run(now, now, id);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Payment not found.' });
  }

  logActivity('ARCHIVE_PAYMENT', 'PAYMENT', id, `Archived payment ${id}`);
  res.json({ message: 'Payment archived.' });
});

// ==========================================
// 10. REMINDERS & FOLLOW-UPS
// ==========================================

apiRouter.get('/reminders', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Custom and stored reminders
  const savedReminders = db.prepare(`
    SELECT * FROM reminders 
    WHERE status != 'completed' AND (snoozed_until IS NULL OR snoozed_until <= ?)
    ORDER BY due_date ASC
  `).all(todayStr);

  // Dynamic system reminders from active vehicle documents expiring within 30 days
  const expiringVehicles = db.prepare(`
    SELECT v.id, v.reg_number, v.make, v.model, v.insurance_expiry, v.fitness_valid_upto, v.permit_valid_upto,
           c.full_name as client_name, c.mobile as client_mobile
    FROM vehicles v
    LEFT JOIN clients c ON v.client_id = c.id
    WHERE v.deleted_at IS NULL AND (
      (v.insurance_expiry IS NOT NULL AND v.insurance_expiry <= ?) OR
      (v.fitness_valid_upto IS NOT NULL AND v.fitness_valid_upto <= ?) OR
      (v.permit_valid_upto IS NOT NULL AND v.permit_valid_upto <= ?)
    )
  `).all(in30Days, in30Days, in30Days) as any[];

  // Dynamic system reminders from pending/due RTO cases
  const dueCases = db.prepare(`
    SELECT rc.id, rc.case_number, rc.service_type, rc.due_date, rc.status,
           c.full_name as client_name, c.mobile as client_mobile,
           v.reg_number as vehicle_reg
    FROM rto_cases rc
    LEFT JOIN clients c ON rc.client_id = c.id
    LEFT JOIN vehicles v ON rc.vehicle_id = v.id
    WHERE rc.deleted_at IS NULL 
      AND rc.status NOT IN ('completed', 'cancelled', 'rejected')
      AND rc.due_date IS NOT NULL 
      AND rc.due_date <= ?
  `).all(in30Days) as any[];

  // Dynamic client follow-ups
  const dueFollowups = db.prepare(`
    SELECT id, full_name, mobile, follow_up_date, follow_up_notes
    FROM clients
    WHERE deleted_at IS NULL 
      AND follow_up_status = 'pending'
      AND follow_up_date IS NOT NULL 
      AND follow_up_date <= ?
  `).all(in30Days) as any[];

  res.json({
    savedReminders,
    expiringVehicles,
    dueCases,
    dueFollowups
  });
});

apiRouter.post('/reminders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, description, due_date, type, entity_type, entity_id } = req.body;

  if (!title?.trim() || !due_date) {
    return res.status(400).json({ error: 'Title and Due Date are required.' });
  }

  const id = generateId('REM');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO reminders (id, type, title, description, due_date, status, entity_type, entity_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    type || 'custom',
    title.trim(),
    description?.trim() || null,
    due_date,
    entity_type || null,
    entity_id || null,
    now,
    now
  );

  logActivity('CREATE_REMINDER', 'REMINDER', id, `Created reminder: ${title}`);
  res.status(201).json({ id, message: 'Reminder created successfully.' });
});

apiRouter.put('/reminders/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, snooze_days, custom_snooze_date } = req.body;
  const now = new Date();

  let snoozedUntil: string | null = null;
  if (status === 'snoozed') {
    if (custom_snooze_date) {
      snoozedUntil = custom_snooze_date;
    } else {
      const days = Number(snooze_days) || 3;
      snoozedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
  }

  const stmt = db.prepare(`
    UPDATE reminders 
    SET status = ?, snoozed_until = ?, updated_at = ?
    WHERE id = ?
  `);

  const info = stmt.run(status, snoozedUntil, now.toISOString(), id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Reminder not found.' });
  }

  res.json({ message: 'Reminder updated successfully.' });
});

// ==========================================
// 11. AUTOMATED BACKUPS & RESTORE
// ==========================================

apiRouter.post('/backup/export', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const backupFilePath = await createBackup();
    const fileName = path.basename(backupFilePath);

    logActivity('BACKUP_CREATED', 'SYSTEM', '1', `Created database backup: ${fileName}`);
    res.download(backupFilePath, fileName);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create backup: ' + err.message });
  }
});

apiRouter.get('/backup/list', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUPS_DIR, f));
        return {
          fileName: f,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list backups.' });
  }
});
