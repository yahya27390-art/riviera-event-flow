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
      toast.error('فشل إرسال الدعوة');
    }
    setInviting(false);
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
                <CardDescription className="text-xs">إدارة حسابات النظام وتعيين صلاحيات المدراء والمحاسبين</CardDescription>
              </div>
              <Button onClick={() => setShowInviteDialog(true)} size="sm" className="rounded-xl h-9 px-4 text-xs font-bold gap-1 bg-primary text-primary-foreground">
                <Plus className="w-4 h-4" /> إضافة مستخدم جديد
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الدور والصلاحية</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                        لا يوجد مستخدمون إضافيون مسجلون
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-bold text-xs">{u.full_name || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={u.role === 'admin' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' : 'bg-muted'}>
                            {u.role === 'admin' ? 'مدير نظام 👑' : 'محاسب مالي 💼'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteUserId(u.id)} className="h-8 w-8 text-rose-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black">إضافة مستخدم / محاسب جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-black">البريد الإلكتروني *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="accountant@qemat-alreef.com"
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black">الدور والصلاحية</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accountant">محاسب مالي (حجوزات، سندات، مصروفات)</SelectItem>
                  <SelectItem value="admin">مدير نظام كامل (كافة الصلاحيات والإعدادات)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)} className="rounded-xl">إلغاء</Button>
              <Button type="submit" disabled={inviting} className="rounded-xl font-bold bg-primary">
                {inviting ? 'جاري الإرسال...' : 'إضافة المستخدم'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}