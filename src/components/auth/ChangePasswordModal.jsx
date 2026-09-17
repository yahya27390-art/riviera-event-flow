import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function ChangePasswordModal({ open, onOpenChange }) {
  const { user, changeUserPasscode } = useAuth();
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setCurrentPasscode('');
    setNewPasscode('');
    setConfirmPasscode('');
    setError('');
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPasscode.trim()) {
      setError('يرجى إدخال رمز المرور الحالي لتأكيد هويتك');
      return;
    }

    if (!newPasscode.trim()) {
      setError('يرجى إدخال رمز المرور الجديد');
      return;
    }

    if (newPasscode.trim().length < 4) {
      setError('رمز المرور الجديد يجب أن يتكون من 4 أرقام/أحرف على الأقل');
      return;
    }

    if (newPasscode.trim() !== confirmPasscode.trim()) {
      setError('رمز المرور الجديد وتأكيده غير متطابقين');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeUserPasscode({
        currentPasscode: currentPasscode.trim(),
        newPasscode: newPasscode.trim()
      });

      if (res.success) {
        toast.success('تم تغيير رمز المرور السري الخاص بك بنجاح 🔐');
        handleOpenChange(false);
      } else {
        setError(res.message || 'فشل تغيير رمز المرور');
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border-border/80 shadow-2xl font-cairo">
        <DialogHeader className="text-right space-y-2 pb-2 border-b border-border/50">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-1">
            <KeyRound className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-black text-foreground">تغيير رمز المرور السري</DialogTitle>
          <p className="text-xs text-muted-foreground">
            قم بتحديث رمز الدخول الخاص بحسابك ({user?.email})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Current Passcode */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">رمز المرور الحالي *</Label>
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                inputMode="numeric"
                value={currentPasscode}
                onChange={(e) => { setCurrentPasscode(e.target.value); setError(''); }}
                placeholder="أدخل رمزك الحالي"
                required
                className="h-11 rounded-2xl bg-muted/40 font-mono text-sm pr-3 pl-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Passcode */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">رمز المرور الجديد (4 أرقام أو أكثر) *</Label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                inputMode="numeric"
                value={newPasscode}
                onChange={(e) => { setNewPasscode(e.target.value); setError(''); }}
                placeholder="أدخل رمز المرور الجديد"
                required
                className="h-11 rounded-2xl bg-muted/40 font-mono text-sm pr-3 pl-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Passcode */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">تأكيد رمز المرور الجديد *</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={confirmPasscode}
              onChange={(e) => { setConfirmPasscode(e.target.value); setError(''); }}
              placeholder="أعد كتابة الرمز الجديد"
              required
              className="h-11 rounded-2xl bg-muted/40 font-mono text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-border/50 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="rounded-2xl text-xs font-bold"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !currentPasscode || !newPasscode || !confirmPasscode}
              className="rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs gap-1.5 shadow-md shadow-amber-500/20"
            >
              <ShieldCheck className="w-4 h-4" />
              {isSubmitting ? 'جاري الحفظ...' : 'تحديث رمز المرور'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
