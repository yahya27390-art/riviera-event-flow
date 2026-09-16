import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, Upload, Download, CheckCircle2, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function DataMigrationTab() {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [jsonInput, setJsonInput] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('bookings');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setDbStatus(null);
    try {
      const tables = [
        { name: 'customers', label: 'العملاء' },
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
        const { data, error } = await supabase.from(t.name).select('*').limit(1);
        if (error) {
          results.push({ name: t.name, label: t.label, ok: false, error: error.message });
          allGood = false;
        } else {
          results.push({ name: t.name, label: t.label, ok: true, count: data?.length || 0 });
        }
      }

      setDbStatus({ allGood, results });
      if (allGood) {
        toast.success('تم الاتصال بقاعدة البيانات بنجاح وجميع الجداول جاهزة!');
      } else {
        toast.error('بعض الجداول لم يتم إنشاؤها بعد في Supabase.');
      }
    } catch (err) {
      setDbStatus({ allGood: false, error: err.message });
      toast.error('فشل الاتصال: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error('يرجى لصق بيانات JSON أولاً');
      return;
    }

    let parsedData = [];
    try {
      const parsed = JSON.parse(jsonInput);
      parsedData = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      toast.error('صيغة JSON غير صالحة. يرجى التأكد من صحة الكود المنسوخ.');
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      // Clean and sanitize records
      const cleanRecords = parsedData.map(item => {
        const row = { ...item };
        // Clean empty id to let uuid generate
        if (!row.id || typeof row.id !== 'string' || row.id.length < 10) {
          delete row.id;
        }
        if (!row.created_at) row.created_at = new Date().toISOString();
        if (!row.created_date) row.created_date = new Date().toISOString();
        return row;
      });

      const { data, error } = await supabase
        .from(selectedEntity)
        .insert(cleanRecords)
        .select();

      if (error) throw error;

      setImportResults({
        success: true,
        count: data?.length || cleanRecords.length,
        entity: selectedEntity
      });

      queryClient.invalidateQueries();
      toast.success(`تم استيراد ${data?.length || cleanRecords.length} سجل بنجاح في جدول (${selectedEntity})!`);
      setJsonInput('');
    } catch (err) {
      console.error('Import error:', err);
      setImportResults({
        success: false,
        error: err.message
      });
      toast.error('فشل الاستيراد: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      toast.info('جاري تجهيز النسخة الاحتياطية...');
      const tables = ['hall_settings', 'customers', 'bookings', 'payments', 'cash_transactions', 'bank_transactions', 'expenses'];
      const backupData = {};

      for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*');
        if (!error && data) {
          backupData[t] = data;
        }
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qemat_alreef_database_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تحميل ملف النسخة الاحتياطية بنجاح!');
    } catch (err) {
      toast.error('فشل تصدير البيانات: ' + err.message);
    }
  };

  const copySqlNotice = () => {
    navigator.clipboard.writeText('-- افتح ملف supabase_schema.sql وانسخ محتواه بالكامل إلى SQL Editor في Supabase');
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    toast.info('تم نسخ التعليمات، يمكنك تشغيل ملف supabase_schema.sql في Supabase');
  };

  return (
    <div className="space-y-6">
      {/* 1. Database Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                حالة الاتصال بقاعدة بيانات Supabase (PostgreSQL)
              </CardTitle>
              <CardDescription>
                التحقق من اتصال الجداول الأساسية (الحجوزات، العملاء، السندات، الخزينة، المصروفات)
              </CardDescription>
            </div>
            <Button onClick={testConnection} disabled={testing} variant="outline" className="gap-2">
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              اختبار الاتصال
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {dbStatus && (
            <div className="space-y-3">
              {dbStatus.allGood ? (
                <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <AlertTitle className="font-bold">قاعدة البيانات متصلة وجاهزة بنسبة 100%</AlertTitle>
                  <AlertDescription>
                    جميع الجداول السبعة مهيأة وتستقبل العمليات الحية بنجاح.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="w-5 h-5" />
                  <AlertTitle className="font-bold">تنبيه: الجداول غير موجودة أو لم يتم تشغيل الـ Schema بعد</AlertTitle>
                  <AlertDescription className="space-y-2 mt-2">
                    <p>
                      يرجى فتح لوحة تحكم <strong>Supabase</strong> ثم الدخول إلى <strong>SQL Editor</strong> وتشغيل محتوى ملف:
                    </p>
                    <code className="block p-2 bg-black/10 rounded text-xs">
                      supabase_schema.sql
                    </code>
                  </AlertDescription>
                </Alert>
              )}

              {dbStatus.results && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {dbStatus.results.map(r => (
                    <div key={r.name} className={`p-3 rounded-lg border flex flex-col justify-between ${r.ok ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                      <div className="text-xs font-semibold text-muted-foreground">{r.label}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-mono">{r.name}</span>
                        {r.ok ? (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-700 text-[10px]">جاهز ({r.count})</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">غير موجود</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Import Old Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            استيراد البيانات القديمة (Data Migration)
          </CardTitle>
          <CardDescription>
            قم باختيار الجدول والصق بيانات JSON للعملاء أو الحجوزات أو السندات لنقلها إلى قاعدة البيانات فوراً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'bookings', label: 'الحجوزات (Bookings)' },
              { id: 'customers', label: 'العملاء (Customers)' },
              { id: 'payments', label: 'السندات (Payments)' },
              { id: 'expenses', label: 'المصروفات (Expenses)' },
              { id: 'cash_transactions', label: 'حركة الكاش (Cash)' },
              { id: 'bank_transactions', label: 'حركة البنك (Bank)' },
            ].map(tab => (
              <Button
                key={tab.id}
                type="button"
                variant={selectedEntity === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEntity(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">
              الصق كود JSON لسجلات ({selectedEntity}):
            </label>
            <Textarea
              rows={8}
              dir="ltr"
              placeholder={`[\n  {\n    "customer_name": "سعد محمد",\n    "customer_phone": "0551234567",\n    "event_date": "2026-10-15",\n    "total_amount": 12000,\n    "status": "مؤكد"\n  }\n]`}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              onClick={handleImport}
              disabled={importing || !jsonInput.trim()}
              className="gap-2"
            >
              <Upload className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
              {importing ? 'جاري الاستيراد...' : `استيراد إلى جدول ${selectedEntity}`}
            </Button>
          </div>

          {importResults && (
            <Alert className={importResults.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}>
              {importResults.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <AlertTitle className="font-bold">تم الاستيراد بنجاح!</AlertTitle>
                  <AlertDescription>
                    تم إدراج {importResults.count} سجل بنجاح في جدول ({importResults.entity}).
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <AlertTitle className="font-bold">حدث خطأ أثناء الاستيراد</AlertTitle>
                  <AlertDescription>
                    {importResults.error}
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 3. Export Backup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            تصدير نسخة احتياطية كاملة (Backup)
          </CardTitle>
          <CardDescription>
            تحميل نسخة كاملة من كافة جداول قاعدة البيانات بصيغة JSON للأمان والأرشفة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportBackup} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            تحميل ملف النسخة الاحتياطية JSON
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
