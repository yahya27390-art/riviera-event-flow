import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Lock, Mail, KeyRound, ShieldCheck, Eye, EyeOff, AlertTriangle, Sparkles, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { loginWithCredentials, rateLimitInfo } = useAuth();
  const [email, setEmail] = useState('sqq00100@gmail.com');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !passcode.trim()) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني ورمز المرور');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const res = await loginWithCredentials(email.trim(), passcode.trim());
    if (!res.success) {
      setErrorMessage(res.message || 'بيانات الدخول غير صحيحة');
      setPasscode('');
    } else {
      toast.success('مرحباً بك! تم تسجيل الدخول بنجاح 👑');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-4 relative overflow-hidden font-cairo">
      {/* Background Decorative Rings */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl bg-card/90 backdrop-blur-2xl border border-amber-500/20 shadow-2xl overflow-hidden p-6 sm:p-8">
        
        {/* Header Branding */}
        <div className="text-center space-y-3 pb-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-xl shadow-amber-500/20">
            <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center text-amber-400">
              <Crown className="w-8 h-8" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              نظام المحاسبة والإدارة المالية
            </div>
            <h1 className="text-2xl font-black text-foreground">قاعة قمة الريف 🇸🇦</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              بوابة الدخول المحمية لصاحب الحساب والإدارة المعتمدة
            </p>
          </div>
        </div>

        {/* Lockout Warning */}
        {rateLimitInfo?.locked && (
          <div className="mb-4 p-3 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>تم قفل محاولات الدخول مؤقتاً لحماية الحساب. يرجى الانتظار {rateLimitInfo.remainingMinutes} دقيقة.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">البريد الإلكتروني المعتمد</Label>
            <div className="relative">
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
                placeholder="sqq00100@gmail.com"
                required
                dir="ltr"
                className="h-12 pl-10 pr-4 text-sm font-medium rounded-2xl bg-muted/40 border-border/80 text-left focus:border-amber-500"
              />
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Passcode / PIN Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">رمز المرور السري (Passcode / PIN)</Label>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">مشفر SHA-256</span>
            </div>
            <div className="relative">
              <Input
                type={showPasscode ? "text" : "password"}
                value={passcode}
                onChange={(e) => { setPasscode(e.target.value); setErrorMessage(''); }}
                placeholder="أدخل رمز المرور..."
                required
                className="h-12 pl-10 pr-10 text-center text-base font-black tracking-widest rounded-2xl bg-muted/40 border-border/80 focus:border-amber-500"
              />
              <KeyRound className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center">
              {errorMessage}
            </div>
          )}

          {/* Remaining Attempts Warning */}
          {rateLimitInfo && !rateLimitInfo.locked && rateLimitInfo.remaining < 5 && (
            <div className="text-[11px] text-amber-500 font-bold text-center">
              ⚠️ متبقي {rateLimitInfo.remaining} محاولات قبل القفل الأمني المؤقت
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || rateLimitInfo?.locked}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-700 hover:to-amber-600 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98] mt-2"
          >
            <ShieldCheck className="w-5 h-5 ml-2" />
            {isSubmitting ? 'جاري التحقق الأمني...' : 'دخول آمن للنظام'}
          </Button>
        </form>

        {/* Security Badges Footer */}
        <div className="mt-6 pt-5 border-t border-border/60 text-center space-y-2">
          <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground font-bold flex-wrap">
            <span className="flex items-center gap-1 text-emerald-500">
              <ShieldCheck className="w-3.5 h-3.5" /> تشفير عالي الحماية
            </span>
            <span>•</span>
            <span>نظام PDPL لحماية البيانات</span>
            <span>•</span>
            <span>قفل تلقائي عند الخمول</span>
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            الحساب مخصص ومقيد حصرياً لصاحب المنشأة وإدارة قاعة قمة الريف
          </p>
        </div>

      </div>
    </div>
  );
}
