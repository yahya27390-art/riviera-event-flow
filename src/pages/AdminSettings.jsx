import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Building2, Save, Upload, Users, Plus, Crown, Trash2, ShieldAlert, 
  Mail, Database, Package, Sliders, DollarSign, FileText, CheckCircle2,
  Building, CalendarHeart, Receipt, ShieldCheck, Sparkles, Scale
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import DataMigrationTab from '@/components/admin/DataMigrationTab';
import PackagesManagerTab from '@/components/admin/PackagesManagerTab';
import SectionsEventsManagerTab from '@/components/admin/SectionsEventsManagerTab';
import BankingPaymentManagerTab from '@/components/admin/BankingPaymentManagerTab';
import SecuritySettingsTab from '@/components/admin/SecuritySettingsTab';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { 
    user: currentUser, 
    registerNewUser, 
    resetUserPasscode, 
    deleteUser: authDeleteUser,
    getUsersSecurityMap 
  } = useAuth();
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

  const hallSettings = settingsList[0] || {};

  const [form, setForm] = useState({
    hall_name: 'قاعة قمة الريف',
    logo_url: '',
    commercial_register: '',
    tax_number: '',
    phone: '',
    address: '',
    city: 'الرياض',
    email: '',
    website: '',
    morning_price: 5000,
    evening_price: 12000,
    deposit_amount: 3000,
    insurance_amount: 1000,
    terms_conditions: 'شروط العقد: يتم دفع العربون لتأكيد الحجز، والمبلغ المتبقي قبل موعد الحفل بأسبوع على الأقل.',
    notes: '',
  });

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('accountant');
  const [inviting, setInviting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);

  useEffect(() => {
    if (hallSettings) {
      setForm({
        hall_name: hallSettings.hall_name || 'قاعة قمة الريف',
        logo_url: hallSettings.logo_url || '',
        commercial_register: hallSettings.commercial_register || '',
        tax_number: hallSettings.tax_number || '',
        phone: hallSettings.phone || '',
        address: hallSettings.address || '',
        city: hallSettings.city || 'الرياض',
        email: hallSettings.email || '',
        website: hallSettings.website || '',
        morning_price: hallSettings.morning_price || 5000,
        evening_price: hallSettings.evening_price || 12000,
        deposit_amount: hallSettings.deposit_amount || 3000,
        insurance_amount: hallSettings.insurance_amount || 1000,
        terms_conditions: hallSettings.terms_conditions || 'شروط العقد: يتم دفع العربون لتأكيد الحجز، والمبلغ المتبقي قبل موعد الحفل بأسبوع على الأقل.',
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
      toast.success('تم حفظ إعدادات وتحديثات القاعة بنجاح');
    },
    onError: (err) => {
      toast.error('فشل الحفظ: ' + err.message);
    }
  });

  const [securityMap, setSecurityMap] = useState({});
  const [resettingEmail, setResettingEmail] = useState(null);

  useEffect(() => {
    getUsersSecurityMap().then(map => setSecurityMap(map || {}));
  }, [users]);

  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    role: 'accountant',
    tempPasscode: '1234',
    mustChange: true,
  });

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة كبير، يرجى اختيار صورة أقل من 2 ميجابايت');
      return;
    }
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Url = uploadEvent.target.result;
      setForm(prev => ({ ...prev, logo_url: base64Url }));
      setLogoUploading(false);
      toast.success('تم تحميل الشعار بنجاح! اضغط "حفظ إعدادات القاعة" لتثبيته.');
    };
    reader.onerror = () => {
      setLogoUploading(false);
      toast.error('فشل قراءة ملف الصورة');
    };
    reader.readAsDataURL(file);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    const cleanEmail = userForm.email.trim();
    if (!cleanEmail) {
      toast.error('يرجى إدخال البريد الإلكتروني للمستخدم');
      return;
    }

    if (cleanEmail === 'sqq00100@gmail.com') {
      toast.error('هذا البريد هو الحساب الرئيسي للمالك (Super Admin). يمكنك تعديل كلمة مروره من تبويب الأمان والحماية.');
      return;
    }

    setInviting(true);
    try {
      const res = await registerNewUser({
        email: cleanEmail,
        full_name: userForm.full_name.trim() || 'مستخدم جديد',
        role: userForm.role,
        tempPasscode: userForm.tempPasscode.trim() || '1234',
        mustChange: userForm.mustChange
      });

      toast.success(`تمت إضافة المستخدم بنجاح! 🎉\nالدور: ${userForm.role === 'admin' ? 'مدير نظام كامل 👑' : 'محاسب مالي 💼'}\nرمز المرور المؤقت: ${res.tempPasscode} 🔐`, {
        duration: 7000
      });
      setShowInviteDialog(false);
      setUserForm({ full_name: '', email: '', role: 'accountant', tempPasscode: '1234', mustChange: true });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      const updatedMap = await getUsersSecurityMap();
      setSecurityMap(updatedMap || {});
    } catch (err) {
      toast.error(err.message || 'فشل إضافة المستخدم');
    } finally {
      setInviting(false);
    }
  };

  const handleResetUserPasscode = async (userEmail) => {
    if (!userEmail) return;
    setResettingEmail(userEmail);
    try {
      const res = await resetUserPasscode(userEmail, '1234');
      toast.success(`تمت إعادة تعيين رمز المرور للمستخدم (${userEmail}) إلى الرمز المؤقت: ${res.tempPasscode} 🔑 وسيُطلب منه تغييره عند تسجيل الدخول.`);
      const updatedMap = await getUsersSecurityMap();
      setSecurityMap(updatedMap || {});
    } catch (err) {
      toast.error('فشل إعادة تعيين رمز المرور: ' + err.message);
    } finally {
      setResettingEmail(null);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserId) return;
    const target = users.find(u => u.id === deleteUserId);
    try {
      await authDeleteUser(deleteUserId, target?.email);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      const updatedMap = await getUsersSecurityMap();
      setSecurityMap(updatedMap || {});
      setDeleteUserId(null);
      toast.success('تم حذف المستخدم وحساب الدخول بنجاح');
    } catch (err) {
      toast.error('فشل حذف المستخدم: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white shadow-xl border border-emerald-800/40">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-black">لوحة التحكم والإعدادات المتقدمة (Backend Control Center)</h1>
            <p className="text-xs text-emerald-200/80 font-medium mt-0.5">
              إدارة الهوية الرسمية، باقات الضيافة السعودية، أسعار القاعة، الحسابات البنكية، والمستخدمين
            </p>
          </div>
        </div>

        <Badge className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 self-start sm:self-center">
          إصدار الإدارة 2026 🇸🇦
        </Badge>
      </div>

      {/* Main Tabbed Control Center */}
      <Tabs defaultValue="identity" className="space-y-6">
        
        {/* Responsive Inset Tab List */}
        <div className="overflow-x-auto no-scrollbar pb-1">
          <TabsList className="h-12 bg-card border border-border/80 p-1 rounded-2xl flex items-center gap-1 w-max min-w-full">
            <TabsTrigger value="identity" className="rounded-xl gap-2 font-bold text-xs py-2 px-3.5 select-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="w-4 h-4 text-amber-500" />
              هوية المنشأة والبيانات الرسمية
            </TabsTrigger>

            <TabsTrigger value="packages" className="rounded-xl gap-2 font-bold text-xs py-2 px-3.5 select-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="w-4 h-4 text-amber-500" />
              باقات الضيافة والخدمات
            </TabsTrigger>

            <TabsTrigger value="sections" className="rounded-xl gap-2 font-bold text-xs py-2 px-3.5 select-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building className="w-4 h-4 text-emerald-500" />
              أقسام القاعة والمناسبات
            </TabsTrigger>

            <TabsTrigger value="pricing" className="rounded-xl gap-2 font-bold text-xs py-2 px-3.5 select-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="w-4 h-4 text-amber-500" />
              الأسعار وشروط العقد
            </TabsTrigger>

            <TabsTrigger value="banking" className="rounded-xl gap-2 font-bold text-xs py-2 px-3.5 select-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Receipt className="w-4 h-4 text-blue-500" />
              الحسابات البنكية والآيبان
            </TabsTrigger>

            <TabsTrigger value="users" className="rounded-xl gap-2 font-bold text-xs py-2 px-3.5 select-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 text-purple-500" />
              فريق العمل والمحاسبين
            </TabsTrigger>

            <TabsTrigger value="database" className="rounded-xl gap-2 font-bold text-xs py-2 px-3.5 select-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Database className="w-4 h-4 text-emerald-500" />
              النسخ الاحتياطي وقاعدة البيانات
            </TabsTrigger>

            <TabsTrigger value="security" className="rounded-xl gap-2 font-bold text-xs py-2 px-3.5 select-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              الأمان والتحصينات وقفل الجلسة 🔒
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Hall Identity & Legal Information */}
        <TabsContent value="identity" className="space-y-6">
          <form onSubmit={e => { e.preventDefault(); saveSettings.mutate(form); }} className="space-y-6">
            
            {/* Logo and Hall Name */}
            <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50">
                <CardTitle className="text-base font-black">الشعار الرسمي وهوية القاعة</CardTitle>
                <CardDescription className="text-xs">تغيير الشعار والاسم المعتمد في العقود وسندات القبض</CardDescription>
              </CardHeader>
              
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  
                  {/* Logo Image Preview */}
                  <div className="flex-shrink-0 flex flex-col items-center sm:items-start">
                    <img 
                      src={form.logo_url || './logo-gold.jpg'} 
                      alt="الشعار" 
                      className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl border bg-white p-2 shadow-md"
                      onError={(e) => { e.target.src = './logo.png'; }}
                    />
                    <label className="mt-2.5 block w-full">
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <Button type="button" variant="outline" size="sm" className="w-full text-xs rounded-xl" disabled={logoUploading} asChild>
                        <span className="cursor-pointer">
                          <Upload className="w-3.5 h-3.5 ml-1" /> {logoUploading ? 'جاري التحميل...' : 'رفع شعار جديد'}
                        </span>
                      </Button>
                    </label>
                  </div>

                  {/* Hall Name & Preset Logos */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-black">اسم القاعة الرسمي *</Label>
                      <Input 
                        value={form.hall_name} 
                        onChange={e => setForm({ ...form, hall_name: e.target.value })} 
                        required 
                        placeholder="قاعة قمة الريف" 
                        className="h-11 rounded-2xl bg-card font-black text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-muted-foreground">نماذج الشعار المعتمدة (اختيار سريع):</span>
                      <div className="flex items-center gap-2 pt-1">
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          className="text-xs h-8 rounded-xl font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
                          onClick={() => { setForm(prev => ({ ...prev, logo_url: './logo-gold.jpg' })); toast.success('تم اختيار الشعار الذهبي الملكي'); }}
                        >
                          الشعار الذهبي الملكي (3D)
                        </Button>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          className="text-xs h-8 rounded-xl font-bold"
                          onClick={() => { setForm(prev => ({ ...prev, logo_url: './logo.png' })); toast.success('تم اختيار الشعار الخطي الكلاسيكي'); }}
                        >
                          الشعار الخطي الأبيض والأسود
                        </Button>
                      </div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Official Legal & Saudi Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Saudi Legal Data */}
              <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-600" />
                    البيانات الرسمية والنظامية (المملكة 🇸🇦)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">رقم السجل التجاري (10 أرقام)</Label>
                    <Input 
                      value={form.commercial_register} 
                      onChange={e => setForm({ ...form, commercial_register: e.target.value })} 
                      dir="ltr" 
                      placeholder="1010XXXXXX"
                      className="rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">الرقم الضريبي VAT (15 رقم)</Label>
                    <Input 
                      value={form.tax_number} 
                      onChange={e => setForm({ ...form, tax_number: e.target.value })} 
                      dir="ltr" 
                      placeholder="3000XXXXXXXX003"
                      className="rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">المدينة</Label>
                    <Input 
                      value={form.city} 
                      onChange={e => setForm({ ...form, city: e.target.value })} 
                      placeholder="الرياض" 
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">العنوان والحي</Label>
                    <Input 
                      value={form.address} 
                      onChange={e => setForm({ ...form, address: e.target.value })} 
                      placeholder="حي القيروان، طريق الملك فهد" 
                      className="rounded-xl"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-500" />
                    بيانات التواصل الرسمية
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">رقم هاتف وإدارة القاعة</Label>
                    <Input 
                      value={form.phone} 
                      onChange={e => setForm({ ...form, phone: e.target.value })} 
                      dir="ltr" 
                      placeholder="+966 5X XXX XXXX"
                      className="rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">البريد الإلكتروني للإدارة</Label>
                    <Input 
                      type="email" 
                      value={form.email} 
                      onChange={e => setForm({ ...form, email: e.target.value })} 
                      dir="ltr" 
                      placeholder="info@qemat-alreef.com"
                      className="rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">الموقع الإلكتروني</Label>
                    <Input 
                      value={form.website} 
                      onChange={e => setForm({ ...form, website: e.target.value })} 
                      dir="ltr" 
                      placeholder="https://qemat-alreef.com"
                      className="rounded-xl font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={saveSettings.isPending}
                className="rounded-2xl h-11 px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
              >
                <Save className="w-4 h-4 ml-2" />
                {saveSettings.isPending ? 'جاري الحفظ...' : 'حفظ بيانات وهوية القاعة'}
              </Button>
            </div>

          </form>
        </TabsContent>

        {/* TAB 2: Hospitality & Services Packages */}
        <TabsContent value="packages">
          <PackagesManagerTab />
        </TabsContent>

        {/* TAB 3: Hall Sections & Event Types */}
        <TabsContent value="sections">
          <SectionsEventsManagerTab />
        </TabsContent>

        {/* TAB 4: Default Pricing & Contract Terms */}
        <TabsContent value="pricing" className="space-y-6">
          <form onSubmit={e => { e.preventDefault(); saveSettings.mutate(form); }} className="space-y-6">
            
            <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                  الأسعار الافتراضية ومبالغ العربون والتأمين
                </CardTitle>
                <CardDescription className="text-xs">تحديد الأسعار التلقائية التي تظهر عند إنشاء حجز جديد</CardDescription>
              </CardHeader>

              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border/60">
                    <Label className="text-xs font-black">إيجار الفترة المسائية (سهرة) *</Label>
                    <Input
                      type="number"
                      value={form.evening_price}
                      onChange={e => setForm({ ...form, evening_price: parseFloat(e.target.value) || 0 })}
                      dir="ltr"
                      required
                      className="rounded-xl bg-card font-black text-primary text-sm text-left"
                    />
                    <span className="text-[10px] text-muted-foreground">ريال سعودي</span>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border/60">
                    <Label className="text-xs font-black">إيجار الفترة الصباحية *</Label>
                    <Input
                      type="number"
                      value={form.morning_price}
                      onChange={e => setForm({ ...form, morning_price: parseFloat(e.target.value) || 0 })}
                      dir="ltr"
                      required
                      className="rounded-xl bg-card font-black text-primary text-sm text-left"
                    />
                    <span className="text-[10px] text-muted-foreground">ريال سعودي</span>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border/60">
                    <Label className="text-xs font-black">العربون التعاقدي المقترح</Label>
                    <Input
                      type="number"
                      value={form.deposit_amount}
                      onChange={e => setForm({ ...form, deposit_amount: parseFloat(e.target.value) || 0 })}
                      dir="ltr"
                      className="rounded-xl bg-card font-black text-emerald-600 text-sm text-left"
                    />
                    <span className="text-[10px] text-muted-foreground">ريال سعودي</span>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border/60">
                    <Label className="text-xs font-black">مبلغ التأمين المسترد</Label>
                    <Input
                      type="number"
                      value={form.insurance_amount}
                      onChange={e => setForm({ ...form, insurance_amount: parseFloat(e.target.value) || 0 })}
                      dir="ltr"
                      className="rounded-xl bg-card font-black text-slate-700 dark:text-slate-300 text-sm text-left"
                    />
                    <span className="text-[10px] text-muted-foreground">ريال سعودي</span>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Contract Terms and Conditions */}
            <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  بنود وشروط العقد المطبوع (الشروط النظامية)
                </CardTitle>
                <CardDescription className="text-xs">تظهر هذه البنود أسفل العقود المطبوعة الموقعة مع العملاء</CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-2">
                <Textarea
                  value={form.terms_conditions}
                  onChange={e => setForm({ ...form, terms_conditions: e.target.value })}
                  rows={5}
                  className="rounded-2xl bg-card text-xs leading-relaxed border-border/80"
                  placeholder="اكتب بنود وشروط العقد..."
                />
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={saveSettings.isPending}
                className="rounded-2xl h-11 px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
              >
                <Save className="w-4 h-4 ml-2" />
                {saveSettings.isPending ? 'جاري الحفظ...' : 'حفظ الأسعار والشروط'}
              </Button>
            </div>

          </form>
        </TabsContent>

        {/* TAB 5: Banking & POS */}
        <TabsContent value="banking">
          <BankingPaymentManagerTab />
        </TabsContent>

        {/* TAB 6: Users & Permissions */}
        <TabsContent value="users" className="space-y-4">
          <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  فريق العمل والمحاسبين والصلاحيات
                </CardTitle>
                <CardDescription className="text-xs">إدارة حسابات النظام وتعيين صلاحيات المدراء والمحاسبين وتوزيع رموز الدخول</CardDescription>
              </div>
              <Button 
                onClick={() => {
                  setUserForm({ full_name: '', email: '', role: 'accountant', tempPasscode: '1234', mustChange: true });
                  setShowInviteDialog(true);
                }} 
                size="sm" 
                className="rounded-2xl h-10 px-4 text-xs font-bold gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20"
              >
                <Plus className="w-4 h-4" /> إضافة مستخدم / صلاحية جديدة
              </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              {/* Owner Super Admin Banner */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 font-black">
                    👑
                  </div>
                  <div>
                    <div className="font-black text-foreground text-sm flex items-center gap-2">
                      صاحب المنشأة / المالك الرئيسي (Super Admin)
                      <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black">حساب الإدارة الأعلى</Badge>
                    </div>
                    <div className="text-muted-foreground font-mono mt-0.5">sqq00100@gmail.com</div>
                  </div>
                </div>
                <div className="text-muted-foreground text-[11px] font-medium bg-card/60 px-3 py-1.5 rounded-xl border border-border/60">
                  يتم تعديل كلمة مرور المالك من تبويب (الأمان والحماية)
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl border border-border/70 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-right text-xs font-black">المستخدم والموظف</TableHead>
                      <TableHead className="text-right text-xs font-black">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right text-xs font-black">الدور والصلاحية</TableHead>
                      <TableHead className="text-right text-xs font-black">حالة كلمة المرور</TableHead>
                      <TableHead className="text-center text-xs font-black">إجراءات الأمان</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs font-semibold">
                          لا يوجد مستخدمون إضافيون مسجلون حالياً. يمكنك إضافة محاسبين أو مدراء بالنقر على "إضافة مستخدم جديد".
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map(u => {
                        const secInfo = securityMap[u.email?.toLowerCase()] || {};
                        const isTemp = secInfo.mustChangePasscode;
                        return (
                          <TableRow key={u.id} className="hover:bg-muted/30">
                            <TableCell className="font-bold text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-bold text-xs text-foreground">
                                  {u.full_name ? u.full_name.charAt(0) : 'U'}
                                </div>
                                <span>{u.full_name || 'مستخدم النظام'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs font-bold ${
                                u.role === 'admin' 
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' 
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              }`}>
                                {u.role === 'admin' ? 'مدير نظام كامل 👑' : 'محاسب مالي 💼'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isTemp ? (
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 text-[11px] font-semibold gap-1">
                                  رمز مؤقت (سيتغير عند الدخول) ⏳
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold gap-1">
                                  رمز دائم نشط 🔒
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleResetUserPasscode(u.email)}
                                  disabled={resettingEmail === u.email}
                                  title="إعادة تعيين رمز المرور المؤقت إلى 1234"
                                  className="h-8 px-2.5 rounded-xl text-[11px] font-bold border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>{resettingEmail === u.email ? 'جاري...' : 'إعادة تعيين رمز مؤقت'}</span>
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setDeleteUserId(u.id)} 
                                  title="حذف المستخدم"
                                  className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 7: Database Migration & Diagnostics */}
        <TabsContent value="database">
          <DataMigrationTab />
        </TabsContent>

        {/* TAB 8: Security & Inactivity Lock Settings */}
        <TabsContent value="security">
          <SecuritySettingsTab />
        </TabsContent>

      </Tabs>

      {/* Invite/Add User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border-border/80 shadow-2xl font-cairo">
          <DialogHeader className="text-right space-y-2 pb-2 border-b border-border/50">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 mb-1">
              <Users className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-black text-foreground">إضافة مستخدم / صلاحية جديدة</DialogTitle>
            <p className="text-xs text-muted-foreground">
              أدخل بيانات الموظف، حدد الصلاحية، وعين له رمز مرور مؤقت للدخول به لأول مرة.
            </p>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-4 pt-3">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">الاسم الكامل للمستخدم / الموظف *</Label>
              <Input
                type="text"
                value={userForm.full_name}
                onChange={e => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="مثال: عبدالمجيد المحاسب"
                required
                className="h-11 rounded-2xl bg-muted/40 text-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">البريد الإلكتروني للدخول *</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="accountant@qemat-alreef.com"
                required
                className="h-11 rounded-2xl bg-muted/40 font-mono text-sm"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">الدور والصلاحية في النظام *</Label>
              <Select 
                value={userForm.role} 
                onValueChange={val => setUserForm(prev => ({ ...prev, role: val }))}
              >
                <SelectTrigger className="h-11 rounded-2xl bg-muted/40 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl font-cairo">
                  <SelectItem value="accountant" className="py-2.5">
                    <div className="text-right">
                      <div className="font-bold text-xs text-foreground">محاسب مالي 💼 (الصلاحية التشغيلية)</div>
                      <div className="text-[11px] text-muted-foreground">حجوزات، سندات قبض وصرف، حركة خزينة وبنوك، تقارير، كشف حساب</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin" className="py-2.5">
                    <div className="text-right">
                      <div className="font-bold text-xs text-amber-600 dark:text-amber-400">مدير نظام كامل 👑 (كافة الصلاحيات والإعدادات)</div>
                      <div className="text-[11px] text-muted-foreground">كافة صفحات المحاسبة + لوحة الإعدادات، الأسعار، الحسابات البنكية، والمستخدمين</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Temporary Passcode */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رمز المرور المؤقت للدخول (PIN) *</Label>
              <Input
                type="text"
                value={userForm.tempPasscode}
                onChange={e => setUserForm(prev => ({ ...prev, tempPasscode: e.target.value }))}
                placeholder="1234"
                required
                className="h-11 rounded-2xl bg-muted/40 font-mono font-bold text-sm tracking-widest text-center"
              />
              <p className="text-[11px] text-muted-foreground">
                ستعطي هذا الرمز للموظف للدخول به أول مرة (الافتراضي 1234).
              </p>
            </div>

            {/* Must Change Passcode Checkbox */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <input
                type="checkbox"
                id="mustChangeCheckbox"
                checked={userForm.mustChange}
                onChange={e => setUserForm(prev => ({ ...prev, mustChange: e.target.checked }))}
                className="mt-1 w-4 h-4 rounded text-amber-500 accent-amber-500"
              />
              <label htmlFor="mustChangeCheckbox" className="text-xs text-foreground font-semibold cursor-pointer select-none">
                <span className="font-bold block text-amber-700 dark:text-amber-400">إلزام المستخدم بتعيين رمز مرور سري دائم فور أول دخول</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  بمجرد تسجيل الدخول بالرمز المؤقت، ستظهر له نافذة إجبارية لكتابة رمزه الخاص ولن يتمكن من استخدام النظام بدونها.
                </span>
              </label>
            </div>

            <DialogFooter className="pt-3 border-t border-border/50 gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowInviteDialog(false)} 
                className="rounded-2xl text-xs font-bold"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={inviting || !userForm.email.trim()} 
                className="rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs gap-1.5 shadow-md shadow-purple-500/20"
              >
                <Plus className="w-4 h-4" />
                {inviting ? 'جاري الإضافة والتشفير...' : 'إضافة وتفعيل المستخدم'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Alert */}
      <AlertDialog open={Boolean(deleteUserId)} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent className="rounded-3xl p-6 font-cairo bg-card border-border/80 shadow-2xl">
          <AlertDialogHeader className="text-right space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-1">
              <Trash2 className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-lg font-black text-foreground">تأكيد حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً؟ سيتم إلغاء صلاحية دخوله للنظام ولن يتمكن من تسجيل الدخول بعد الآن.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/50">
            <AlertDialogCancel className="rounded-2xl text-xs font-bold">إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteUser}
              className="rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}