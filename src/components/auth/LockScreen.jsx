import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Unlock, ShieldAlert, KeyRound, LogOut, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { checkUnlockRateLimit } from '@/lib/security';

export default function LockScreen() {
  const { user, unlockSession, logout } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlockInfo, setUnlockInfo] = useState(checkUnlockRateLimit());

  // Refresh rate-limit info on mount
  useEffect(() => { setUnlockInfo(checkUnlockRateLimit()); }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!passcode) {
      setError('يرجى إدخال رمز المرور السري');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = await unlockSession(passcode);
    if (!res.success) {
      if (res.forceLogout) {
        toast.error('تم تسجيل الخروج لأسباب أمنية — يرجى إعادة تسجيل الدخول', { duration: 5000 });
        return; // logout(true) already called inside AuthContext
      }
      setError(res.message || 'رمز المرور غير صحيح');
      setPasscode('');
      setUnlockInfo(checkUnlockRateLimit()); // refresh attempt count display
    } else {
      toast.success('تم فتح قفل الجلسة بنجاح 🔓');
    }
    setIsSubmitting(false);
  };

  const handleKeypadPress = (digit) => {
    if (passcode.length < 12) {
      setPasscode(prev => prev + digit);
      setError('');
    }
  };

  const handleKeypadBackspace = () => {
    setPasscode(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl overflow-hidden p-6 sm:p-8 text-center glass-card">
        
        {/* Glow Header */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-4">
          {/* Lock Icon */}
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full rounded-[22px] bg-slate-900 flex items-center justify-center text-amber-400">
              <Lock className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              قاعة قمة الريف 🇸🇦
            </div>
            <h2 className="text-xl font-black text-foreground">الجلسة مقفلة للأمان</h2>
            <p className="text-xs text-muted-foreground mt-1">
              تم القفل التلقائي لعدم النشاط لحماية السجلات المالية
            </p>
          </div>

          {/* User Email Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-mono font-bold text-foreground">
            {user?.email || 'sqq00100@gmail.com'}
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 pt-2">
            <div className="relative">
              <Input
                type="password"
                inputMode="numeric"
                value={passcode}
                onChange={(e) => { setPasscode(e.target.value); setError(''); }}
                placeholder="أدخل رمز المرور السري..."
                className="h-12 text-center text-lg font-black tracking-widest rounded-2xl bg-muted/40 border-amber-500/30 focus:border-amber-500 pr-10"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 justify-center text-xs font-bold text-rose-500 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Unlock attempt counter warning */}
            {unlockInfo.remaining !== undefined && unlockInfo.remaining < 3 && (
              <div className="flex items-center gap-1.5 justify-center text-xs font-bold text-amber-500 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>⚠️ تحذير: متبقي {unlockInfo.remaining} محاولة فقط قبل تسجيل الخروج الإجباري</span>
              </div>
            )}

            {/* Quick Keypad */}
            <div className="grid grid-cols-3 gap-2 py-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(String(num))}
                  className="h-10 rounded-xl bg-muted/50 hover:bg-muted font-black text-base transition-all active:scale-95 border border-border/50"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="h-10 rounded-xl bg-muted/30 hover:bg-muted text-xs font-bold transition-all text-muted-foreground"
              >
                مسح ⌫
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-10 rounded-xl bg-muted/50 hover:bg-muted font-black text-base transition-all active:scale-95 border border-border/50"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPasscode('')}
                className="h-10 rounded-xl bg-muted/30 hover:bg-muted text-xs font-bold transition-all text-muted-foreground"
              >
                إلغاء C
              </button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !passcode}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black shadow-lg shadow-amber-600/25"
            >
              <Unlock className="w-4 h-4 ml-2" />
              {isSubmitting ? 'جاري التحقق...' : 'فتح القفل والمتابعة'}
            </Button>
          </form>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => logout(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              تسجيل الخروج والانتقال لصفحة الدخول
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
