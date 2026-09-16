import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Building2, Save, Upload, Users, Plus, Crown, Trash2, ShieldAlert, Mail } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const hallSettings = settingsList[0];

  const [form, setForm] = useState({
    hall_name: '', logo_url: '', commercial_register: '', tax_number: '',
    phone: '', address: '', city: '', email: '', website: '',
    bank_name: '', iban: '', notes: '',
  });

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('accountant');
  const [inviting, setInviting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteAccountStep, setDeleteAccountStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (hallSettings) {
      setForm({
        hall_name: hallSettings.hall_name || '',
        logo_url: hallSettings.logo_url || '',
        commercial_register: hallSettings.commercial_register || '',
        tax_number: hallSettings.tax_number || '',
        phone: hallSettings.phone || '',
        address: hallSettings.address || '',
        city: hallSettings.city || '',
        email: hallSettings.email || '',
        website: hallSettings.website || '',
        bank_name: hallSettings.bank_name || '',
        iban: hallSettings.iban || '',
        notes: hallSettings.notes || '',
      });
    }
  }, [hallSettings]);

  const saveSettings = useMutation({
    mutationFn: async (data) => {
      if (hallSettings?.id) {
        return base44.entities.HallSettings.update(hallSettings.id, data);
      } else {
        return base44.entities.HallSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hallSettings'] });
      toast.success('تم حفظ إعدادات القاعة بنجاح');
    },
  });

  const updateUserRole = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('تم تحديث الصلاحية'); },
    onError: () => toast.error('فشل تحديث الصلاحية'),
  });

  const deleteUser = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('تم حذف المستخدم');
      setDeleteUserId(null);
    },
    onError: () => {
      toast.error('فشل حذف المستخدم');
      setDeleteUserId(null);
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, logo_url: file_url }));
    setLogoUploading(false);
    toast.success('تم رفع الشعار');
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast.success(`تم إرسال دعوة إلى ${inviteEmail}`);
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('accountant');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error('فشل إرسال الدعوة — تأكد من صحة البريد الإلكتروني');
    }
    setInviting(false);
  };

  const roleLabel = (role) => role === 'admin' ? 'مدير' : 'محاسب';
  const roleColor = (role) => role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground';

  const userToDelete = users.find(u => u.id === deleteUserId);

  return (
    <div>
      <PageHeader title="إعدادات النظام" description="إدارة بيانات القاعة والمستخدمين والصلاحيات" />

      <Tabs defaultValue="hall" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="hall" className="gap-2 select-none"><Building2 className="w-4 h-4" /> بيانات القاعة</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 select-none"><Users className="w-4 h-4" /> المستخدمون</TabsTrigger>
          <TabsTrigger value="danger" className="gap-2 select-none text-destructive"><ShieldAlert className="w-4 h-4" /> حذف الحساب</TabsTrigger>
        </TabsList>

        {/* Hall Settings */}
        <TabsContent value="hall">
          <form onSubmit={e => { e.preventDefault(); saveSettings.mutate(form); }} className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">الشعار والاسم</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="الشعار" className="w-24 h-24 object-contain rounded-xl border bg-white p-2" />
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed bg-muted flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <label className="mt-2 block">
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <Button type="button" variant="outline" size="sm" className="w-full mt-2" disabled={logoUploading} asChild>
                        <span className="cursor-pointer">
                          <Upload className="w-3 h-3 ml-1" /> {logoUploading ? 'جاري الرفع...' : 'رفع شعار'}
                        </span>
                      </Button>
                    </label>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <Label>اسم القاعة *</Label>
                      <Input value={form.hall_name} onChange={e => setForm({ ...form, hall_name: e.target.value })} required placeholder="مثال: قاعة ريفيرا" />
                    </div>
                    <div className="space-y-2">
                      <Label>المدينة</Label>
                      <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="الرياض" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">بيانات الاتصال</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2"><Label>رقم الهاتف</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} dir="ltr" placeholder="+966 5X XXX XXXX" /></div>
                  <div className="space-y-2"><Label>البريد الإلكتروني</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-2"><Label>الموقع الإلكتروني</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-2"><Label>العنوان</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">البيانات الرسمية</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2"><Label>رقم السجل التجاري</Label><Input value={form.commercial_register} onChange={e => setForm({ ...form, commercial_register: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-2"><Label>الرقم الضريبي</Label><Input value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-2"><Label>اسم البنك</Label><Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>رقم الآيبان (IBAN)</Label><Input value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} dir="ltr" placeholder="SA..." /></div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">ملاحظات تظهر في الفواتير</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="مثال: شكراً لاختياركم قاعة ريفيرا. يسعدنا خدمتكم." />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saveSettings.isPending} className="gap-2">
                <Save className="w-4 h-4" /> {saveSettings.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">المستخدمون ({users.length})</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">يمكن للمدير والمحاسبين فقط الدخول للنظام</p>
              </div>
              <Button size="sm" onClick={() => setShowInviteDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" /> دعوة مستخدم
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الصلاحية</TableHead>
                    <TableHead className="text-right">تغيير الصلاحية</TableHead>
                    <TableHead className="text-right">إزالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' && <Crown className="w-4 h-4 text-accent" />}
                          <span className="font-medium text-sm">{user.full_name || user.email?.split('@')[0] || '-'}</span>
                          {user.id === currentUser?.id && <Badge variant="secondary" className="text-[10px]">أنت</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm" dir="ltr">{user.email}</TableCell>
                      <TableCell><Badge variant="outline" className={roleColor(user.role)}>{roleLabel(user.role)}</Badge></TableCell>
                      <TableCell>
                        <Select
                          value={user.role || 'accountant'}
                          onValueChange={(role) => updateUserRole.mutate({ id: user.id, role })}
                          disabled={user.id === currentUser?.id}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">مدير</SelectItem>
                            <SelectItem value="accountant">محاسب</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          disabled={user.id === currentUser?.id}
                          onClick={() => setDeleteUserId(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone - Delete Account */}
        <TabsContent value="danger">
          <Card className="border-destructive/30 border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> منطقة الخطر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-sm space-y-2">
                <p className="font-semibold text-destructive">طلب حذف الحساب وإغلاقه نهائياً</p>
                <p className="text-muted-foreground">
                  سيؤدي هذا الإجراء إلى حذف جميع بيانات القاعة والحجوزات والمدفوعات والمصروفات نهائياً. لا يمكن التراجع عن هذه العملية.
                </p>
                <p className="text-muted-foreground">
                  سيتم مراجعة طلبك وإرسال تأكيد عبر البريد الإلكتروني قبل التنفيذ.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setDeleteAccountStep(1)} className="gap-2">
                <Trash2 className="w-4 h-4" /> طلب حذف الحساب
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> دعوة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>البريد الإلكتروني (Gmail)</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required dir="ltr" placeholder="example@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير — صلاحية كاملة</SelectItem>
                  <SelectItem value="accountant">محاسب — بدون إدارة المستخدمين</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">سيتم إرسال دعوة للبريد الإلكتروني. يجب على المستخدم تسجيل الدخول عبر نفس البريد للوصول للنظام.</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={inviting}>{inviting ? 'جاري الإرسال...' : 'إرسال الدعوة'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => { if (!open) setDeleteUserId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><ShieldAlert className="w-5 h-5" /> تأكيد إزالة المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إزالة <strong>{userToDelete?.full_name || userToDelete?.email}</strong> من النظام؟
              لن يتمكن من الدخول للبرنامج بعد إزالته.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUser.mutate(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              إزالة المستخدم
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Double Confirmation */}
      <Dialog open={deleteAccountStep > 0} onOpenChange={(open) => { if (!open) { setDeleteAccountStep(0); setConfirmText(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              {deleteAccountStep === 1 ? 'تأكيد طلب حذف الحساب' : 'التأكيد النهائي'}
            </DialogTitle>
          </DialogHeader>
          {deleteAccountStep === 1 ? (
            <div className="space-y-4">
              <p className="text-sm">
                أنت على وشك طلب حذف حسابك وجميع البيانات المرتبطة به. هذا الإجراء <strong>غير قابل للتراجع</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                سيتم إرسال طلبك لمراجعة الإدارة. للمتابعة، اضغط "متابعة".
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDeleteAccountStep(0); setConfirmText(''); }}>إلغاء</Button>
                <Button variant="destructive" onClick={() => setDeleteAccountStep(2)}>متابعة</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                للتأكيد النهائي، اكتب <strong className="text-destructive">"حذف"</strong> في الحقل أدناه:
              </p>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="اكتب: حذف"
                dir="rtl"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDeleteAccountStep(0); setConfirmText(''); }}>إلغاء</Button>
                <Button
                  variant="destructive"
                  disabled={confirmText.trim() !== 'حذف'}
                  onClick={() => {
                    toast.success('تم إرسال طلب حذف الحساب. سيتم التواصل معك عبر البريد الإلكتروني.');
                    setDeleteAccountStep(0);
                    setConfirmText('');
                  }}
                >
                  تأكيد الحذف النهائي
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}