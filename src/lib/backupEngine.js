import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const BACKUP_STORAGE_KEY = 'qemat_alreef_database_backups_v1';
const RETENTION_DAYS = 15;

/**
 * Fetch all records from all system tables
 */
export async function fetchFullDatabaseDump() {
  const [
    { data: bookings = [] },
    { data: payments = [] },
    { data: expenses = [] },
    { data: cashTxns = [] },
    { data: bankTxns = [] },
    { data: hallSettings = [] }
  ] = await Promise.all([
    supabase.from('bookings').select('*'),
    supabase.from('payments').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('cash_transactions').select('*'),
    supabase.from('bank_transactions').select('*'),
    supabase.from('hall_settings').select('*')
  ]);

  const timestamp = Date.now();
  const dateStr = new Date(timestamp).toISOString().split('T')[0];

  const snapshot = {
    id: `backup-${dateStr}-${timestamp}`,
    timestamp,
    dateStr,
    version: '1.0',
    hallName: 'قاعة قمة الريف',
    summary: {
      bookingsCount: bookings.length,
      paymentsCount: payments.length,
      expensesCount: expenses.length,
      cashTransactionsCount: cashTxns.length,
      bankTransactionsCount: bankTxns.length,
      totalRecords: bookings.length + payments.length + expenses.length + cashTxns.length + bankTxns.length
    },
    tables: {
      bookings,
      payments,
      expenses,
      cash_transactions: cashTxns,
      bank_transactions: bankTxns,
      hall_settings: hallSettings
    }
  };

  return snapshot;
}

/**
 * Get all existing local & remote backup snapshots
 */
export function getSavedBackups() {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Purge backups older than retention period (15 days)
 */
export function purgeExpiredBackups(backups, retentionDays = RETENTION_DAYS) {
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  const validBackups = backups.filter(b => (now - (b.timestamp || 0)) <= maxAgeMs);
  const purgedCount = backups.length - validBackups.length;
  
  return { validBackups, purgedCount };
}

/**
 * Automated Daily Backup & Auto-Purge Scheduler
 * Triggered on app load or interval
 */
export async function runAutomatedDailyBackupAndPurge() {
  try {
    const existingBackups = getSavedBackups();
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if backup was already taken today
    const alreadyBackedUpToday = existingBackups.some(b => b.dateStr === todayStr);

    let updatedList = [...existingBackups];

    if (!alreadyBackedUpToday) {
      console.log('🛡️ Creating Automated Daily Database Snapshot...');
      const newSnapshot = await fetchFullDatabaseDump();
      updatedList.unshift(newSnapshot);
    }

    // Run 15-day auto-purge
    const { validBackups, purgedCount } = purgeExpiredBackups(updatedList, RETENTION_DAYS);
    
    if (purgedCount > 0) {
      console.log(`🧹 Auto-purged ${purgedCount} backup snapshots older than 15 days.`);
    }

    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(validBackups));
    return { success: true, count: validBackups.length, purgedCount };
  } catch (err) {
    console.error('Automated backup error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Trigger manual backup creation
 */
export async function createManualBackup() {
  try {
    const snapshot = await fetchFullDatabaseDump();
    const existing = getSavedBackups();
    const updated = [snapshot, ...existing];
    const { validBackups, purgedCount } = purgeExpiredBackups(updated, RETENTION_DAYS);
    
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(validBackups));
    return { success: true, snapshot, purgedCount };
  } catch (err) {
    throw new Error('فشل إنشاء النسخة الاحتياطية: ' + err.message);
  }
}

/**
 * Download snapshot as formatted JSON
 */
export function downloadBackupFile(snapshot) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `qemat_alreef_backup_${snapshot.dateStr || 'snapshot'}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Restore database from snapshot
 */
export async function restoreDatabaseFromSnapshot(snapshot) {
  if (!snapshot || !snapshot.tables) {
    throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف.');
  }

  const { bookings, payments, expenses, cash_transactions, bank_transactions } = snapshot.tables;

  // Clear existing
  await Promise.all([
    supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('cash_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('bank_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  ]);

  // Insert tables
  if (bookings?.length) await supabase.from('bookings').insert(bookings);
  if (payments?.length) await supabase.from('payments').insert(payments);
  if (expenses?.length) await supabase.from('expenses').insert(expenses);
  if (cash_transactions?.length) await supabase.from('cash_transactions').insert(cash_transactions);
  if (bank_transactions?.length) await supabase.from('bank_transactions').insert(bank_transactions);

  return true;
}
