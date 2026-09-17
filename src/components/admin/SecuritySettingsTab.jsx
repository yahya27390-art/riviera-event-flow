import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Lock, Mail, KeyRound, Clock, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function SecuritySettingsTab() {
  const { user, securityConfig, updateSecuritySettings, lockSessionNow, logout } = useAuth();

  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newEmail, setNewEmail] = useState(securityConfig?.ownerEmail || 'sqq00100@gmail.com');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [timeoutMinutes, setTimeoutMinutes] = useState(String(securityConfig?.inactivityTimeoutMinutes || '15'));
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    if (!currentPasscode.trim()) {
      toast.error('يرجى إدخال رمز المرور الحالي لتأكيد هويتك');
      return;
    }

    if (newPasscode && newPasscode !== confirmPasscode) {
      toast.error('رمز المرور الجديد وتأكيده غير متطابقين');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateSecuritySettings({
        currentPasscode: currentPasscode.trim(),
        newEmail: newEmail.trim(),
        newPasscode: newPasscode.trim() || undefined,
        newTimeout: timeoutMinutes
      });

      if (!res.success) {
        toast.error(res.message || 'فشل تحديث إعدادات الأمان');
      } else {
        toast.success(res.message || 'تم حفظ إعدادات الأمان بنجاح 🔒');
        setCurrentPasscode('');
        setNewPasscode('');
        setConfirmPasscode('');
      }
    } catch (err) {
      toast.error('حدث خطأ: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Security Status Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              منظومة الأمان والتحصينات الرقمية
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">نشط ومحمي 🛡️</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تشفير SHA-256 عالي الأمان، حظر هجمات التخمين، وقفل تلقائي عند الخمول
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={lockSessionNow}
            className="rounded-xl border-amber-500/40 hover:bg-amber-500/10 text-xs font-bold gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            قفل الجلسة الآن
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => logout(true)}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            تسجيل خروج
          </Button>
        </div>
      </div>

      <form onSubmit={handleSaveSecurity} className="space-y-6">
        
        {/* Credentials & Access Control */}
        <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              بيانات الدخول والتحكم بصاحب الحساب
            </CardTitle>
            <CardDescription className="text-xs">
              البريد الإلكتروني المعتمد للدخول ورمز المرور السري (Passcode / PIN)
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Owner Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">البريد الإلكتروني لصاحب المنشأة *</Label>
                <div className="relative">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="h-11 pl-10 pr-3 rounded-2xl bg-card border-border/80 text-left font-medium"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-muted-foreground">البريد الوحيد المصرح له بتسجيل الدخول للنظام</p>
              </div>

              {/* Inactivity Timeout */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">فترة القفل التلقائي عند عدم النشاط *</Label>
                <Select value={timeoutMinutes} onValueChange={setTimeoutMinutes}>
                  <SelectTrigger className="h-11 rounded-2xl bg-card border-border/80 font-medium">
                    <SelectValue placeholder="اختر مدة القفل" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="5">قفل بعد 5 دقائق من الخمول ⏱️</SelectItem>
                    <SelectItem value="10">قفل بعد 10 دقائق من الخمول ⏱️</SelectItem>
                    <SelectItem value="15">قفل بعد 15 دقيقة (موصى به) ⭐</SelectItem>
                    <SelectItem value="30">قفل بعد 30 دقيقة ⏱️</SelectItem>
                    <SelectItem value="0">تعطيل القفل التلقائي (غير موصى به)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">يتم قفل الشاشة تلقائياً لمنع الاطلاع على البيانات في حال ترك الجهاز</p>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <h4 className="text-xs font-black text-foreground mb-3">تعديل رمز المرور السري (اتركه فارغاً إذا كنت لا ترغب بتغييره):</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">رمز المرور السري الجديد (PIN / Passcode)</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    placeholder="أدخل رمز جديد (مثال: 7799 أو أكثر)"
                    className="h-11 text-center font-bold tracking-widest rounded-2xl bg-card border-border/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">تأكيد رمز المرور الجديد</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="أعد كتابة الرمز للتأكيد"
                    className="h-11 text-center font-bold tracking-widest rounded-2xl bg-card border-border/80"
                  />
                </div>
              </div>
            </div>

            {/* Current Passcode Verification */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 mt-4">
              <Label className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                تأكيد الهوية: أدخل رمز المرور الحالي لحفظ التعديلات *
              </Label>
              <Input
                type="password"
                value={currentPasscode}
                onChange={(e) => setCurrentPasscode(e.target.value)}
                placeholder="أدخل رمز المرور الحالي لتأكيد الحفظ..."
                required
                className="h-11 rounded-2xl bg-card border-amber-500/40 text-center font-black tracking-widest"
              />
            </div>

          </CardContent>
        </Card>

        {/* Defensive Rules & Compliance Badges */}
        <Card className="rounded-3xl border border-border/80 shadow-sm p-5 space-y-3 bg-muted/10">
          <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            المعايير الأمنية المطبقة في النظام:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-card border border-border/70 space-y-1">
              <div className="font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تشفير الهاش المملح (Salted SHA-256)
              </div>
              <p className="text-[11px] text-muted-foreground">لا يتم حفظ أي رموز أو كلمات مرور كنصوص مكشوفة إطلاقاً.</p>
            </div>

            <div className="p-3 rounded-2xl bg-card border border-border/70 space-y-1">
              <div className="font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> الحماية من هجمات القوة العمياء
              </div>
              <p className="text-[11px] text-muted-foreground">قفل الحساب لمدة 5 دقائق بعد 5 محاولات إدخال خاطئة متتالية.</p>
            </div>

            <div className="p-3 rounded-2xl bg-card border border-border/70 space-y-1">
              <div className="font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> الامتثال لنظام حماية البيانات (PDPL)
              </div>
              <p className="text-[11px] text-muted-foreground">عزل بيانات العملاء وحمايتها من التسريب أو التعديل غير المصرح به.</p>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <Button
          type="submit"
          disabled={isSaving}
          className="h-12 px-8 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black text-sm shadow-xl shadow-amber-600/20"
        >
          <ShieldCheck className="w-4 h-4 ml-2" />
          {isSaving ? 'جاري التحقق والحفظ...' : 'حفظ إعدادات الأمان والتحصينات'}
        </Button>

      </form>
    </div>
  );
}
