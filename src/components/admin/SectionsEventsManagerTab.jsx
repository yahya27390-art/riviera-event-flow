import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DEFAULT_SECTIONS, DEFAULT_EVENT_TYPES } from '@/lib/systemSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Building, CalendarHeart, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SectionsEventsManagerTab() {
  const queryClient = useQueryClient();
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState({ id: '', label: '', desc: '' });
  const [eventForm, setEventForm] = useState({ id: '', label: '', desc: '' });
  const [editingId, setEditingId] = useState(null);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  const sections = hallSettings.custom_sections || DEFAULT_SECTIONS;
  const eventTypes = hallSettings.custom_event_types || DEFAULT_EVENT_TYPES;

  const saveSettingsMutation = useMutation({
    mutationFn: async (updatedData) => {
      if (hallSettings.id) {
        return base44.entities.HallSettings.update(hallSettings.id, updatedData);
      } else {
        return base44.entities.HallSettings.create(updatedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hallSettings'] });
      setSectionDialogOpen(false);
      setEventDialogOpen(false);
      setEditingId(null);
      toast.success('تم حفظ التعديلات بنجاح');
    },
    onError: (err) => {
      toast.error('فشل الحفظ: ' + err.message);
    }
  });

  // Handle Section Add/Edit
  const handleSaveSection = (e) => {
    e.preventDefault();
    if (!sectionForm.label.trim()) return;

    let updated;
    if (editingId) {
      updated = sections.map(s => s.id === editingId ? { ...s, label: sectionForm.label, desc: sectionForm.desc } : s);
    } else {
      const newSec = {
        id: sectionForm.label,
        label: sectionForm.label,
        desc: sectionForm.desc || 'قسم مخصص'
      };
      updated = [...sections, newSec];
    }
    saveSettingsMutation.mutate({ custom_sections: updated });
  };

  const handleDeleteSection = (id) => {
    const updated = sections.filter(s => s.id !== id);
    saveSettingsMutation.mutate({ custom_sections: updated });
  };

  // Handle Event Type Add/Edit
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventForm.label.trim()) return;

    let updated;
    if (editingId) {
      updated = eventTypes.map(ev => ev.id === editingId ? { ...ev, label: eventForm.label, desc: eventForm.desc } : ev);
    } else {
      const newEv = {
        id: eventForm.label,
        label: eventForm.label,
        desc: eventForm.desc || 'نوع مناسبة مخصص'
      };
      updated = [...eventTypes, newEv];
    }
    saveSettingsMutation.mutate({ custom_event_types: updated });
  };

  const handleDeleteEvent = (id) => {
    const updated = eventTypes.filter(ev => ev.id !== id);
    saveSettingsMutation.mutate({ custom_event_types: updated });
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Hall Sections Management */}
      <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              أقسام وصالات القاعة
            </CardTitle>
            <CardDescription className="text-xs">تحديد أقسام وصالات الحجز المتاحة في القاعة</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditingId(null); setSectionForm({ id: '', label: '', desc: '' }); setSectionDialogOpen(true); }}
            className="rounded-xl h-9 px-3.5 text-xs font-bold gap-1 bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4" /> إضافة قسم جديد
          </Button>
        </CardHeader>
        
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sections.map(sec => (
              <div key={sec.id} className="p-3.5 rounded-2xl bg-card border border-border/70 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-foreground">{sec.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sec.desc}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditingId(sec.id); setSectionForm({ id: sec.id, label: sec.label, desc: sec.desc }); setSectionDialogOpen(true); }}
                    className="h-8 w-8 rounded-lg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSection(sec.id)}
                    className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Event Types Management */}
      <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-4 bg-muted/20 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <CalendarHeart className="w-5 h-5 text-amber-500" />
              أنواع المناسبات والاحتفالات
            </CardTitle>
            <CardDescription className="text-xs">تخصيص تصنيفات المناسبات المتاحة عند تسجيل الحجوزات</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditingId(null); setEventForm({ id: '', label: '', desc: '' }); setEventDialogOpen(true); }}
            className="rounded-xl h-9 px-3.5 text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950"
          >
            <Plus className="w-4 h-4" /> إضافة نوع مناسبة
          </Button>
        </CardHeader>
        
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {eventTypes.map(ev => (
              <div key={ev.id} className="p-3.5 rounded-2xl bg-card border border-border/70 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-foreground">{ev.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{ev.desc}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditingId(ev.id); setEventForm({ id: ev.id, label: ev.label, desc: ev.desc }); setEventDialogOpen(true); }}
                    className="h-8 w-8 rounded-lg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              {editingId ? 'تعديل قسم القاعة' : 'إضافة قسم جديد للقاعة'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSection} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-black">اسم القسم مع الرمز *</Label>
              <Input
                value={sectionForm.label}
                onChange={e => setSectionForm({ ...sectionForm, label: e.target.value })}
                placeholder="مثال: الصالة الملكية الخارجية 🌴"
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black">الوصف</Label>
              <Input
                value={sectionForm.desc}
                onChange={e => setSectionForm({ ...sectionForm, desc: e.target.value })}
                placeholder="مثال: مناسبة للجلسات المفتوحة"
                className="rounded-xl"
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)} className="rounded-xl">إلغاء</Button>
              <Button type="submit" disabled={saveSettingsMutation.isPending} className="rounded-xl font-bold bg-primary">
                {saveSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ القسم'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              {editingId ? 'تعديل نوع المناسبة' : 'إضافة نوع مناسبة جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEvent} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-black">اسم المناسبة مع الرمز *</Label>
              <Input
                value={eventForm.label}
                onChange={e => setEventForm({ ...eventForm, label: e.target.value })}
                placeholder="مثال: غبقة رمضانية 🌙"
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black">الوصف</Label>
              <Input
                value={eventForm.desc}
                onChange={e => setEventForm({ ...eventForm, desc: e.target.value })}
                placeholder="مثال: مناسبات شهر رمضان المبارك"
                className="rounded-xl"
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setEventDialogOpen(false)} className="rounded-xl">إلغاء</Button>
              <Button type="submit" disabled={saveSettingsMutation.isPending} className="rounded-xl font-bold bg-amber-500 text-slate-950">
                {saveSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ المناسبة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
