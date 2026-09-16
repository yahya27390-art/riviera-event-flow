import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DEFAULT_PACKAGES } from '@/lib/systemSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, Pencil, Trash2, Package, Sparkles, Coffee, Utensils, 
  Crown, Music, Flame, Gift, Check, RotateCcw, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/bookingNumber';

const iconMap = {
  Coffee: Coffee,
  Utensils: Utensils,
  Crown: Crown,
  Music: Music,
  Flame: Flame,
  Gift: Gift,
  Package: Package,
  Sparkles: Sparkles,
};

const colorOptions = [
  { id: 'amber', label: 'ذهبي / بني', class: 'from-amber-700 to-amber-900' },
  { id: 'emerald', label: 'زمردي / أخضر', class: 'from-emerald-700 to-emerald-900' },
  { id: 'purple', label: 'بنفسجي ملكي', class: 'from-purple-700 to-indigo-900' },
  { id: 'blue', label: 'أزرق سماوي', class: 'from-blue-700 to-cyan-900' },
  { id: 'rose', label: 'قرمزي / وردي', class: 'from-rose-700 to-red-900' },
  { id: 'slate', label: 'رمادي مذهب', class: 'from-slate-700 to-slate-900' },
];

const emptyPackage = {
  name: '',
  shortName: '',
  price: '',
  category: 'ضيافة',
  icon: 'Sparkles',
  color: 'from-amber-700 to-amber-900',
  desc: '',
  active: true,
};

export default function PackagesManagerTab() {
  const queryClient = useQueryClient();
  const [editingPkg, setEditingPkg] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletePkgId, setDeletePkgId] = useState(null);
  const [form, setForm] = useState(emptyPackage);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  // Loaded packages from DB or fallback
  const customPackages = hallSettings.packages || DEFAULT_PACKAGES;

  const savePackagesMutation = useMutation({
    mutationFn: async (updatedList) => {
      if (hallSettings.id) {
        return base44.entities.HallSettings.update(hallSettings.id, { packages: updatedList });
      } else {
        return base44.entities.HallSettings.create({ packages: updatedList });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hallSettings'] });
      setIsDialogOpen(false);
      setEditingPkg(null);
      setForm(emptyPackage);
      toast.success('تم حفظ وتحديث باقات الخدمات بنجاح!');
    },
    onError: (err) => {
      toast.error('فشل حفظ الباقات: ' + err.message);
    }
  });

  const handleOpenAdd = () => {
    setEditingPkg(null);
    setForm(emptyPackage);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPkg(pkg);
    setForm({
      name: pkg.name || '',
      shortName: pkg.shortName || pkg.name || '',
      price: pkg.price || '',
      category: pkg.category || 'ضيافة',
      icon: pkg.icon || 'Sparkles',
      color: pkg.color || 'from-amber-700 to-amber-900',
      desc: pkg.desc || '',
      active: pkg.active !== false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      toast.error('يرجى كتابة اسم الباقة وسعرها');
      return;
    }

    const priceNum = parseFloat(form.price) || 0;
    let updated;

    if (editingPkg) {
      // Edit existing
      updated = customPackages.map(p => {
        if (p.id === editingPkg.id) {
          return {
            ...p,
            ...form,
            price: priceNum,
          };
        }
        return p;
      });
    } else {
      // Add new
      const newPkg = {
        id: `pkg-${Date.now()}`,
        ...form,
        shortName: form.shortName || form.name,
        price: priceNum,
      };
      updated = [...customPackages, newPkg];
    }

    savePackagesMutation.mutate(updated);
  };

  const handleDelete = (id) => {
    const updated = customPackages.filter(p => p.id !== id);
    savePackagesMutation.mutate(updated);
    setDeletePkgId(null);
  };

  const handleToggleActive = (id) => {
    const updated = customPackages.map(p => {
      if (p.id === id) {
        return { ...p, active: !p.active };
      }
      return p;
    });
    savePackagesMutation.mutate(updated);
  };

  const handleResetDefaults = () => {
    savePackagesMutation.mutate(DEFAULT_PACKAGES);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-3xl bg-card border border-border/80 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            إدارة باقات الخدمات والضيافة والتجهيز
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تخصيص وإضافة وتعديل الباقات والأسعار المتاحة أثناء إنشاء العقود والحجوزات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="rounded-xl h-10 px-3 text-xs gap-1.5 font-bold border-border"
          >
            <RotateCcw className="w-3.5 h-3.5" /> استعادة الباقات الافتراضية
          </Button>

          <Button
            type="button"
            onClick={handleOpenAdd}
            className="rounded-xl h-10 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> إضافة باقة جديدة
          </Button>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customPackages.map((pkg) => {
          const IconComponent = iconMap[pkg.icon] || Sparkles;
          const isActive = pkg.active !== false;

          return (
            <Card 
              key={pkg.id} 
              className={cn(
                "rounded-3xl border transition-all overflow-hidden relative group",
                isActive 
                  ? "bg-card border-border/80 shadow-sm hover:shadow-md hover:border-amber-500/40" 
                  : "bg-muted/30 border-dashed border-border/60 opacity-60"
              )}
            >
              <CardContent className="p-5 space-y-4">
                
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md",
                      `bg-gradient-to-br ${pkg.color || 'from-amber-700 to-amber-900'}`
                    )}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground">{pkg.shortName || pkg.name}</h3>
                      <Badge variant="outline" className="text-[10px] font-bold mt-0.5">
                        {pkg.category || 'ضيافة'}
                      </Badge>
                    </div>
                  </div>

                  <span className="text-sm font-black text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                    {formatCurrency(pkg.price)}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[36px]">
                  {pkg.desc || 'لا يوجد وصف تفصيلي'}
                </p>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(pkg.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-xl transition-all",
                      isActive 
                        ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20" 
                        : "text-muted-foreground bg-muted hover:bg-muted/80"
                    )}
                  >
                    {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isActive ? 'مفعلة' : 'معطلة'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(pkg)}
                      className="h-8 w-8 rounded-xl hover:bg-muted text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletePkgId(pkg.id)}
                      className="h-8 w-8 rounded-xl hover:bg-rose-50 text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Package Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl glass-card">
          <div className="p-5 pb-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white border-b border-emerald-800/40">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">
                  {editingPkg ? 'تعديل بيانات الباقة' : 'إضافة باقة وخدمة جديدة'}
                </DialogTitle>
                <p className="text-[11px] text-emerald-200/80 font-medium">لوحة تحكم إعدادات الخدمات 🇸🇦</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">اسم الباقة الكامل *</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: باقة القهوة والضيافة السعودية الملكية"
                required
                className="h-10.5 rounded-2xl bg-card font-bold text-sm"
              />
            </div>

            {/* Short Name & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-foreground">الاسم المختصر للعقد</Label>
                <Input
                  value={form.shortName}
                  onChange={e => setForm({ ...form, shortName: e.target.value })}
                  placeholder="مثال: ضيافة سعودية"
                  className="h-10.5 rounded-2xl bg-card font-bold text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black text-foreground">السعر الافتراضي (ر.س) *</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="1500"
                  required
                  dir="ltr"
                  className="h-10.5 rounded-2xl bg-card font-black text-primary text-sm text-left"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">تصنيف الخدمة</Label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
                {['ضيافة', 'عشاء وبوفيه', 'ديكور ومسرح', 'صوتيات', 'إضاءة', 'أخرى'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat })}
                    className={cn(
                      "py-1.5 rounded-xl text-xs font-bold transition-all",
                      form.category === cat
                        ? "bg-card text-foreground shadow-sm font-black border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">رمز الأيقونة</Label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {Object.entries(iconMap).map(([iconName, IconComp]) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setForm({ ...form, icon: iconName })}
                    className={cn(
                      "h-10 rounded-xl flex items-center justify-center border transition-all",
                      form.icon === iconName
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                        : "bg-card text-muted-foreground hover:text-foreground border-border"
                    )}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Gradient Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">لون الشارة</Label>
              <div className="grid grid-cols-3 gap-2">
                {colorOptions.map(col => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setForm({ ...form, color: col.class })}
                    className={cn(
                      "p-2 rounded-xl border flex items-center gap-2 transition-all text-xs font-bold",
                      form.color === col.class
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border bg-card"
                    )}
                  >
                    <span className={cn("w-4 h-4 rounded-full bg-gradient-to-br", col.class)} />
                    <span className="text-[11px]">{col.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">وصف وتفاصيل الباقة</Label>
              <Textarea
                value={form.desc}
                onChange={e => setForm({ ...form, desc: e.target.value })}
                rows={2}
                placeholder="توضيح تفاصيل الباقة المشمولة..."
                className="rounded-2xl bg-card text-xs border-border/80"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border flex flex-row items-center justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-10 px-4 text-xs">
                إلغاء
              </Button>
              <Button 
                type="submit"
                disabled={savePackagesMutation.isPending}
                className="rounded-xl h-10 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-transform"
              >
                {savePackagesMutation.isPending ? 'جاري الحفظ...' : (editingPkg ? 'تأكيد التعديلات' : 'إضافة الباقة')}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletePkgId} onOpenChange={() => setDeletePkgId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> تأكيد حذف الباقة
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الباقة؟ لن يؤثر ذلك على العقود السابقة المسجلة بها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deletePkgId)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              حذف الباقة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
