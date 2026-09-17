import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SAUDI_BANKS } from '@/lib/systemSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, CreditCard, Plus, Trash2, Pencil, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BankingPaymentManagerTab() {
  const queryClient = useQueryClient();
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [bankForm, setBankForm] = useState({
    bank_name: SAUDI_BANKS[0] || 'مصرف الراجحي',
    account_name: '',
    account_number: '',
    iban: '',
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  const bankAccounts = useMemo(() => {
    try {
      if (Array.isArray(hallSettings.bank_accounts) && hallSettings.bank_accounts.length > 0) {
        return hallSettings.bank_accounts;
      }
      if (typeof hallSettings.bank_accounts === 'string') {
        const parsed = JSON.parse(hallSettings.bank_accounts);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      if (hallSettings.notes && typeof hallSettings.notes === 'string') {
        try {
          const parsedNotes = JSON.parse(hallSettings.notes);
          if (Array.isArray(parsedNotes?.bank_accounts) && parsedNotes.bank_accounts.length > 0) {
            return parsedNotes.bank_accounts;
          }
        } catch {
          // not json
        }
      }
    } catch {
      // fallback
    }

    return [
      {
        bank_name: hallSettings.bank_name || 'مصرف الراجحي',
        account_name: hallSettings.hall_name || 'قاعة قمة الريف',
        account_number: '',
        iban: hallSettings.iban || 'SA0000000000000000000000',
      }
    ];
  }, [hallSettings]);

  const saveBankAccountsMutation = useMutation({
    mutationFn: async (updatedAccounts) => {
      const primary = updatedAccounts[0] || {};
      
      let notesObj = {};
      try {
        if (hallSettings.notes && hallSettings.notes.startsWith('{')) {
          notesObj = JSON.parse(hallSettings.notes);
        }
      } catch {
        notesObj = {};
      }
      notesObj.bank_accounts = updatedAccounts;

      const payload = {
        bank_name: primary.bank_name || 'مصرف الراجحي',
        iban: primary.iban || '',
        notes: JSON.stringify(notesObj)
      };

      if (hallSettings.id) {
        return base44.entities.HallSettings.update(hallSettings.id, payload);
      } else {
        return base44.entities.HallSettings.create({
          hall_name: 'قاعة قمة الريف',
          ...payload
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hallSettings'] });
      setBankDialogOpen(false);
      setEditingIndex(null);
      toast.success('تم حفظ وتحديث الحسابات البنكية بنجاح');
    },
    onError: (err) => {
      toast.error('فشل حفظ الحسابات: ' + err.message);
    }
  });

  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (!bankForm.iban.trim()) {
      toast.error('يرجى إدخال رقم الآيبان (IBAN)');
      return;
    }

    let updated;
    if (editingIndex !== null) {
      updated = bankAccounts.map((acc, i) => i === editingIndex ? { ...bankForm } : acc);
    } else {
      updated = [...bankAccounts, { ...bankForm }];
    }
    saveBankAccountsMutation.mutate(updated);
  };

  const handleDelete = (index) => {
    if (bankAccounts.length <= 1) {
      toast.error('يجب الإبقاء على حساب بنكي رئيسي واحد على الأقل للمطالبات');
      return;
    }
    const updated = bankAccounts.filter((_, i) => i !== index);
    saveBankAccountsMutation.mutate(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 rounded-3xl bg-card border border-border/80 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            الحسابات البنكية وأجهزة نقاط البيع المعتمدة
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            إدارة الحسابات البنكية وأرقام الآيبان الرسمية المستخدمة في رسائل تذكير العملاء والعقود
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingIndex(null);
            setBankForm({ bank_name: SAUDI_BANKS[0] || 'مصرف الراجحي', account_name: '', account_number: '', iban: '' });
            setBankDialogOpen(true);
          }}
          className="rounded-xl h-10 px-4 bg-primary text-primary-foreground font-black text-xs gap-1.5 shadow-md active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> إضافة حساب بنكي
        </Button>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bankAccounts.map((acc, idx) => (
          <Card key={idx} className="rounded-3xl border border-border/80 shadow-sm bg-card overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-foreground">{acc.bank_name}</h3>
                    <p className="text-xs text-muted-foreground">{acc.account_name || 'حساب القاعة الرسمي'}</p>
                  </div>
                </div>

                {idx === 0 && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                    الحساب الرئيسي الافتراضي
                  </Badge>
                )}
              </div>

              {/* IBAN Box */}
              <div className="p-3 rounded-2xl bg-muted/50 border border-border/60 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground">رقم الآيبان (IBAN):</span>
                <p className="font-mono text-xs sm:text-sm font-black text-foreground tracking-wider select-all" dir="ltr">
                  {acc.iban || 'غير مسجل'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingIndex(idx);
                    setBankForm({ ...acc });
                    setBankDialogOpen(true);
                  }}
                  className="rounded-xl h-8 text-xs font-bold gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" /> تعديل
                </Button>
                {idx > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(idx)}
                    className="rounded-xl h-8 text-xs font-bold text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add / Edit Bank Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {editingIndex !== null ? 'تعديل الحساب البنكي' : 'إضافة حساب بنكي سعودي جديد'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAccount} className="space-y-4 pt-2">
            
            <div className="space-y-1.5">
              <Label className="text-xs font-black">اسم البنك *</Label>
              <Select value={bankForm.bank_name} onValueChange={v => setBankForm({ ...bankForm, bank_name: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAUDI_BANKS.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black">اسم الحساب / صاحب الحساب</Label>
              <Input
                value={bankForm.account_name}
                onChange={e => setBankForm({ ...bankForm, account_name: e.target.value })}
                placeholder="مثال: شركة قمة الريف للمناسبات"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black">رقم الآيبان الدولي (IBAN) *</Label>
              <Input
                value={bankForm.iban}
                onChange={e => setBankForm({ ...bankForm, iban: e.target.value.toUpperCase() })}
                placeholder="SA00 0000 0000 0000 0000 0000"
                dir="ltr"
                required
                className="rounded-xl font-mono text-sm font-bold"
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setBankDialogOpen(false)} className="rounded-xl">إلغاء</Button>
              <Button type="submit" disabled={saveBankAccountsMutation.isPending} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">
                {saveBankAccountsMutation.isPending ? 'جاري الحفظ...' : 'تأكيد الحساب'}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
