import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, Upload, Download, CheckCircle2, AlertCircle, RefreshCw, 
  Trash2, ShieldCheck, Clock, FileJson, Archive, Sparkles, HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getSavedBackups, 
  createManualBackup, 
  downloadBackupFile, 
  restoreDatabaseFromSnapshot,
  runAutomatedDailyBackupAndPurge
} from '@/lib/backupEngine';

export default function DataMigrationTab() {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    await runAutomatedDailyBackupAndPurge();
    setBackups(getSavedBackups());
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await createManualBackup();
      toast.success('تم إنشاء وحفظ النسخة الاحتياطية بنجاح 💾');
      setBackups(getSavedBackups());
      if (res.snapshot) {
        downloadBackupFile(res.snapshot);
      }
    } catch (err) {
      toast.error(err.message || 'فشل إنشاء النسخة الاحتياطية');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestore = async (snapshot) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في استعادة بيانات النسخة الاحتياطية المؤرخة بـ (${snapshot.dateStr})؟ سيتم استبدال البيانات الحالية.`)) {
      return;
    }

    setRestoringId(snapshot.id);
    try {
      await restoreDatabaseFromSnapshot(snapshot);
      queryClient.invalidateQueries();
      toast.success('تمت استعادة البيانات بنجاح 🔄');
    } catch (err) {
      toast.error('فشل استعادة البيانات: ' + err.message);
    } finally {
      setRestoringId(null);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setDbStatus(null);
    try {
      const tables = [
        { name: 'bookings', label: 'الحجوزات' },
        { name: 'payments', label: 'السندات والدفعات' },
        { name: 'cash_transactions', label: 'الخزينة (كاش)' },
        { name: 'bank_transactions', label: 'البنك' },
        { name: 'expenses', label: 'المصروفات' },
        { name: 'hall_settings', label: 'إعدادات القاعة' }
      ];

      const results = [];
      let allGood = true;

      for (const t of tables) {
        const { count, error } = await supabase.from(t.name).select('*', { count: 'exact', head: true });
        if (error) {
          results.push({ name: t.name, label: t.label, ok: false, error: error.message });
          allGood = false;
        } else {
          results.push({ name: t.name, label: t.label, ok: true, count: count || 0 });
        }
      }

      setDbStatus({ allGood, results });
      if (allGood) {
        toast.success('قاعدة البيانات متصلة وجاهزة بنسبة 100%!');
      } else {
        toast.error('حدث تحذير في بعض الجداول.');
      }
    } catch (err) {
      setDbStatus({ allGood: false, error: err.message });
      toast.error('فشل الاتصال: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Automated Backup & Retention Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/30 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              الجدولة التلقائية للنسخ الاحتياطي والحذف الدوري
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">مفعل 24/7 🛡️</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              نسخ احتياطي يومي تلقائي • احتفاظ دوري لمدة 15 يوماً • حذف تلقائي للنسخ الأقدم من 15 يوماً
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleCreateBackup}
          disabled={creatingBackup}
          className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-11 px-5 gap-2 shadow-lg shadow-emerald-600/20"
        >
          <HardDrive className="w-4 h-4" />
          {creatingBackup ? 'جاري أخذ النسخة...' : 'أخذ نسخة احتياطية فورية الآن 💾'}
        </Button>
      </div>

      {/* Database Health Check */}
      <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              حالة اتصال قاعدة البيانات (PostgreSQL / Supabase)
            </CardTitle>
            <CardDescription className="text-xs">فحص جاهزية وتعداد السجلات في كافة الجداول المالية والتشغيلية</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={testConnection} disabled={testing} className="rounded-xl gap-1.5 font-bold text-xs h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            فحص الجداول الآن
          </Button>
        </CardHeader>

        <CardContent className="p-5">
          {dbStatus && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {dbStatus.results?.map(r => (
                <div key={r.name} className="p-3 rounded-2xl bg-muted/40 border border-border/70 text-center space-y-1">
                  <div className="text-xs font-bold text-foreground truncate">{r.label}</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {r.ok ? r.count : 'خطأ'}
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${r.ok ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600'}`}>
                    {r.ok ? 'جاهز ومتصل' : 'تحذير'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {!dbStatus && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              اضغط على «فحص الجداول الآن» لعرض التعداد الفعلي للسجلات في السيرفر.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automated Backups History (Last 15 Days) */}
      <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-500" />
            سجل النسخ الاحتياطية اليومية (آخر 15 يوماً)
          </CardTitle>
          <CardDescription className="text-xs">
            يتم الاحتفاظ بنسخ آخر 15 يوماً تلقائياً ومسح النسخ الأقدم لتوفير المساحة والحماية
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          {backups.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <FileJson className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">لا توجد نسخ سابقة محفوظة محلياً. اضغط على الزر أعلاه لإنشاء أول نسخة.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((b, idx) => (
                <div key={b.id || idx} className="p-4 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-border transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-foreground">نسخة يوم {b.dateStr}</span>
                      {idx === 0 && (
                        <Badge className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold">
                          أحدث نسخة 🌟
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(b.timestamp).toLocaleTimeString('ar-SA')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span>🏛️ {b.summary?.bookingsCount || 0} حجز</span>
                      <span>•</span>
                      <span>🧾 {b.summary?.paymentsCount || 0} سند قبض</span>
                      <span>•</span>
                      <span>📉 {b.summary?.expensesCount || 0} مصروف</span>
                      <span>•</span>
                      <span className="font-bold text-foreground">إجمالي السجلات: {b.summary?.totalRecords || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBackupFile(b)}
                      className="rounded-xl gap-1 text-xs font-bold h-9"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      تحميل JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={restoringId === b.id}
                      onClick={() => handleRestore(b)}
                      className="rounded-xl gap-1 text-xs font-bold h-9 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${restoringId === b.id ? 'animate-spin' : ''}`} />
                      استعادة
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
