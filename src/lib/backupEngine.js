import { supabase } from '@/lib/supabase';

const BACKUP_STORAGE_KEY = 'qemat_alreef_database_backups_v1';

export async function fetchFullDatabaseDump() {
  const { data: tables, error } = await supabase.rpc('accounting_snapshot');
  if (error) throw error;
  if (!tables?.bookings || !tables?.payments) throw new Error('النسخة الاحتياطية غير مكتملة');
  const timestamp = Date.now();
  const dateStr = new Date(timestamp).toISOString().slice(0, 10);
  return { id: `backup-${timestamp}`, timestamp, dateStr, version: '2.0',
    tables, summary: {
      bookingsCount: tables.bookings.length, paymentsCount: tables.payments.length,
      expensesCount: tables.expenses.length, cashTransactionsCount: tables.cash_transactions.length,
      bankTransactionsCount: tables.bank_transactions.length,
      totalRecords: Object.values(tables).reduce((sum, rows) => sum + rows.length, 0),
    } };
}

export function getSavedBackups() {
  try { return JSON.parse(localStorage.getItem(BACKUP_STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function purgeExpiredBackups(backups, retentionDays = 15) {
  const validBackups = backups.filter(b => Date.now() - b.timestamp <= retentionDays * 86400000);
  return { validBackups, purgedCount: backups.length - validBackups.length };
}

export async function createManualBackup() {
  const snapshot = await fetchFullDatabaseDump();
  const { validBackups, purgedCount } = purgeExpiredBackups([snapshot, ...getSavedBackups()]);
  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(validBackups));
  return { success: true, snapshot, purgedCount };
}

export async function runAutomatedDailyBackupAndPurge() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || user?.app_metadata?.role !== 'admin') return { success: false, skipped: true };
    const date = new Date().toISOString().slice(0, 10);
    if (getSavedBackups().some(b => b.dateStr === date)) return { success: true };
    return await createManualBackup();
  } catch (error) { return { success: false, error: error.message }; }
}

export function downloadBackupFile(snapshot) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `riviera_backup_${snapshot.dateStr}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function restoreDatabaseFromSnapshot() {
  // No database calls: never replace a live ledger from a browser snapshot.
  throw new Error('الاستعادة فوق السجلات الحالية موقوفة لحماية الحجوزات والأرصدة. تُستعاد النسخة في قاعدة منفصلة للمراجعة.');
}
