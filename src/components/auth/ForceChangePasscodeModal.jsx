import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ForceChangePasscodeModal() {
  const { user, completeMandatoryPasscodeChange } = useAuth();
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPasscode.trim()) {
      setError('يرجى إدخال رمز المرور السري الجديد');
      return;
    }

    if (newPasscode.trim().length < 4) {
      setError('رمز المرور يجب أن يتكون من 4 أرقام/أحرف على الأقل');
      return;
    }

    if (newPasscode.trim() !== confirmPasscode.trim()) {
      setError('رمز المرور الجديد وتأكيده غير متطابقين');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await completeMandatoryPasscodeChange(newPasscode.trim());
      if (res.success) {
        toast.success('تم تعيين رمز المرور السري الخاص بك بنجاح 🔐');
      } else {
        setError(res.message || 'فشل تحديث رمز المرور');
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 animate-in fade-in duration-300 font-cairo">
      <div className="relative w-full max-w-md rounded-3xl bg-card border border-amber-500/30 shadow-2xl overflow-hidden p-6 sm:p-8 glass-card">
        
        {/* Glow Header */}
        <div className="text-center space-y-3 pb-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
            <KeyRound className="w-7 h-7" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              أول تسجيل دخول للحساب
            </div>
            <h2 className="text-xl font-black text-foreground">تعيين رمز المرور الدائم</h2>
            <p className="text-xs text-muted-foreground mt-1">
              لقد دخلت باستخدام رمز مرور مؤقت. للحفاظ على سرية وأمان الحساب، يرجى كتابة رمز المرور السري الخاص بك للمتابعة.
            </p>
          </div>
        </div>

        {/* User Badge */}
        <div className="p-3 rounded-2xl bg-muted/60 border border-border/70 text-xs text-center space-y-0.5 mb-4">
          <div className="font-bold text-foreground">{user?.full_name || 'مستخدم النظام'}</div>
          <div className="text-muted-foreground font-mono text-[11px]">{user?.email}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">رمز المرور السري الجديد (Passcode / PIN) *</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={newPasscode}
              onChange={(e) => { setNewPasscode(e.target.value); setError(''); }}
              placeholder="أدخل رمزك الجديد (مثال: 4 إلى 8 أرقام)"
              required
              autoFocus
              className="h-11 rounded-2xl bg-muted/40 text-center font-black tracking-widest text-base border-border/80 focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">تأكيد رمز المرور الجديد *</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={confirmPasscode}
              onChange={(e) => { setConfirmPasscode(e.target.value); setError(''); }}
              placeholder="أعد كتابة الرمز الجديد للتأكيد"
              required
              className="h-11 rounded-2xl bg-muted/40 text-center font-black tracking-widest text-base border-border/80 focus:border-amber-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !newPasscode || !confirmPasscode}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-700 hover:to-amber-600 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 mt-2"
          >
            <ShieldCheck className="w-4 h-4 ml-2" />
            {isSubmitting ? 'جاري الحفظ والتشفير...' : 'حفظ الرمز السري والدخول للنظام'}
          </Button>
        </form>

      </div>
    </div>
  );
}
