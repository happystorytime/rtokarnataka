import path from 'path';
import fs from 'fs';

// Force tests to run on isolated test database
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test_rto.db');
process.env.DATABASE_PATH = TEST_DB_PATH;

async function runTests() {
  const { db, initializeDatabase, createBackup } = await import('./db.ts');
  const { isInitialized, setupAdmin, authenticateAdmin, updatePassword } = await import('./auth.ts');

  console.log('--- Starting Automated Test Suite: Karnataka RTO Document Management System ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // Test 1: Initialize Database
  initializeDatabase();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t: any) => t.name);
  assert(tables.includes('admin_auth'), 'admin_auth table exists');
  assert(tables.includes('clients'), 'clients table exists');
  assert(tables.includes('vehicles'), 'vehicles table exists');
  assert(tables.includes('rto_cases'), 'rto_cases table exists');
  assert(tables.includes('documents'), 'documents table exists');
  assert(tables.includes('payments'), 'payments table exists');
  assert(tables.includes('vehicle_exchanges'), 'vehicle_exchanges table exists');

  // Clean test auth records
  db.prepare('DELETE FROM admin_sessions').run();
  db.prepare('DELETE FROM admin_auth').run();

  // Test 2: Initial Admin Setup
  assert(!isInitialized(), 'Initially isInitialized() returns false');
  const setupRes = await setupAdmin('rto_owner', 'MasterPass123!');
  assert(setupRes.success, 'setupAdmin successfully creates master owner');
  assert(isInitialized(), 'isInitialized() returns true after setup');

  // Test 3: Re-setup prevention
  const secondSetup = await setupAdmin('hacker', 'BadPass123!');
  assert(!secondSetup.success, 'setupAdmin prevents re-initialization');

  // Test 4: Failed login attempt and invalid password
  const badLogin = await authenticateAdmin('rto_owner', 'WrongPass!', '127.0.0.1');
  assert(!badLogin.success, 'Invalid password is rejected');

  // Test 5: Successful login and session token generation
  const goodLogin = await authenticateAdmin('rto_owner', 'MasterPass123!', '127.0.0.1');
  assert(goodLogin.success && !!goodLogin.token, 'Correct credentials yield a valid session token');

  const session = db.prepare('SELECT * FROM admin_sessions WHERE token = ?').get(goodLogin.token!) as any;
  assert(!!session && new Date(session.expires_at) > new Date(), 'Session saved in admin_sessions with future expiry');

  // Test 6: Rate Limiting & Lockout
  for (let i = 0; i < 5; i++) {
    await authenticateAdmin('rto_owner', 'WrongPass!');
  }
  const lockedLogin = await authenticateAdmin('rto_owner', 'MasterPass123!');
  assert(!lockedLogin.success && Boolean(lockedLogin.error?.includes('locked')), 'Account locks out after 5 consecutive failed attempts');

  // Reset lock for remaining tests
  db.prepare('UPDATE admin_auth SET failed_attempts = 0, locked_until = NULL WHERE id = 1').run();

  // Test 7: Client duplicate detection logic
  db.prepare('DELETE FROM payments WHERE client_id = ?').run('CLI-TEST-001');
  db.prepare('DELETE FROM rto_cases WHERE client_id = ?').run('CLI-TEST-001');
  db.prepare('DELETE FROM vehicles WHERE client_id = ?').run('CLI-TEST-001');
  db.prepare('DELETE FROM clients WHERE mobile = ? OR id = ?').run('9876543210', 'CLI-TEST-001');
  const testClientId = 'CLI-TEST-001';
  db.prepare(`
    INSERT INTO clients (id, full_name, mobile, city, status, created_at, updated_at)
    VALUES (?, 'Suresh Gowda', '9876543210', 'Mandya', 'active', datetime('now'), datetime('now'))
  `).run(testClientId);

  const existingClient = db.prepare('SELECT id, full_name FROM clients WHERE mobile = ? AND deleted_at IS NULL').get('9876543210') as any;
  assert(existingClient && existingClient.id === testClientId, 'Client saved and queried by mobile number');

  // Test 8: Vehicle duplicate chassis / registration logic
  const testVehId = 'VEH-TEST-001';
  db.prepare('DELETE FROM vehicles WHERE chassis_number = ?').run('MB8TESTCHASSIS999');
  db.prepare(`
    INSERT INTO vehicles (id, category, reg_number, make, model, chassis_number, engine_number, client_id, status, created_at, updated_at)
    VALUES (?, 'new_vehicle', 'KA-01-MJ-9999', 'Maruti Suzuki', 'Swift', 'MB8TESTCHASSIS999', 'ENGTEST8888', ?, 'active', datetime('now'), datetime('now'))
  `).run(testVehId, testClientId);

  const existingVeh = db.prepare('SELECT * FROM vehicles WHERE chassis_number = ? AND deleted_at IS NULL').get('MB8TESTCHASSIS999') as any;
  assert(existingVeh && existingVeh.reg_number === 'KA-01-MJ-9999', 'Vehicle created and indexed by chassis VIN');

  // Test 9: RTO Case creation and fee balance calculation
  const testCaseId = 'RTO-TEST-001';
  db.prepare('DELETE FROM rto_cases WHERE id = ?').run(testCaseId);
  db.prepare(`
    INSERT INTO rto_cases (id, case_number, client_id, vehicle_id, service_type, rto_office, status, checklist, opened_date, service_charge, government_fee, created_at, updated_at)
    VALUES (?, 'KA-REG-999999', ?, ?, 'new_registration', 'KA-01 (Koramangala)', 'new', '[]', '2026-11-04', 1500, 1000, datetime('now'), datetime('now'))
  `).run(testCaseId, testClientId, testVehId);

  const cRow = db.prepare('SELECT service_charge, government_fee FROM rto_cases WHERE id = ?').get(testCaseId) as any;
  assert(cRow.service_charge === 1500 && cRow.government_fee === 1000, 'Case fees correctly stored');

  // Test 10: Payments recording & net balance
  const testPayId = 'PAY-TEST-001';
  db.prepare('DELETE FROM payments WHERE id = ?').run(testPayId);
  db.prepare(`
    INSERT INTO payments (id, payment_number, payment_date, client_id, case_id, category, amount, payment_method, created_at, updated_at)
    VALUES (?, 'RCP-TEST-01', '2026-11-04', ?, ?, 'client_payment', 1500, 'upi', datetime('now'), datetime('now'))
  `).run(testPayId, testClientId, testCaseId);

  const totalCharges = cRow.service_charge + cRow.government_fee; // 2500
  const paidRow = db.prepare('SELECT SUM(amount) as paid FROM payments WHERE case_id = ? AND deleted_at IS NULL').get(testCaseId) as any;
  const balance = totalCharges - (paidRow.paid || 0);
  assert(balance === 1000, `Balance calculated accurately: ₹${totalCharges} - ₹${paidRow.paid} = ₹${balance}`);

  // Test 11: Database Backup Generation
  const backupPath = await createBackup();
  assert(fs.existsSync(backupPath), `Database backup snapshot created at ${backupPath}`);
  assert(fs.statSync(backupPath).size > 0, 'Backup file has non-zero size');

  // Clean test records
  db.prepare('DELETE FROM payments WHERE id = ?').run(testPayId);
  db.prepare('DELETE FROM rto_cases WHERE id = ?').run(testCaseId);
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(testVehId);
  db.prepare('DELETE FROM clients WHERE id = ?').run(testClientId);
  db.prepare('DELETE FROM admin_sessions').run();
  db.prepare('DELETE FROM admin_auth').run();

  console.log(`\nTest Results: ${passed} PASSED, ${failed} FAILED.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
