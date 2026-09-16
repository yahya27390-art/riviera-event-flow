import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, Wallet, MoreHorizontal, Plus, 
  Building2, Receipt, BarChart3, Settings, FileText, AlertCircle, X, Crown, ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function IPhoneBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const moreItems = [
    { path: '/bank', label: 'الحسابات البنكية', icon: Building2, desc: 'حسابات البنوك وشبكات مدى' },
    { path: '/expenses', label: 'المصروفات التشغيلية', icon: Receipt, desc: 'فواتير وصيانة ورواتب القاعة' },
    { path: '/pending-payments', label: 'المطالبات والتحصيل', icon: AlertCircle, desc: 'متابعة وتذكير المبالغ المتبقية' },
    { path: '/customer-statement', label: 'كشف حساب عميل', icon: FileText, desc: 'تاريخ وسجل تعاملات العميل' },
    { path: '/reports', label: 'التقارير والإحصائيات', icon: BarChart3, desc: 'تحليل الإيرادات ونسبة الإشغال' },
    { path: '/admin', label: 'إعدادات النظام', icon: Settings, desc: 'بيانات القاعة والشعار وترحيل البيانات', adminOnly: true },
  ].filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <>
      {/* Native iOS Glassmorphism Floating Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-[env(safe-area-inset-bottom,8px)] pt-2 bg-card/90 backdrop-blur-2xl border-t border-border/80 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          
          {/* Tab 1: Dashboard */}
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200",
              isActive('/') 
                ? "text-primary font-black scale-105" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all",
              isActive('/') ? "bg-primary/10 text-primary" : ""
            )}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-bold">الرئيسية</span>
          </Link>

          {/* Tab 2: Bookings */}
          <Link
            to="/bookings"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200",
              isActive('/bookings') 
                ? "text-primary font-black scale-105" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all",
              isActive('/bookings') ? "bg-primary/10 text-primary" : ""
            )}>
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-bold">الحجوزات</span>
          </Link>

          {/* Center Elevated Action: New Booking (+) */}
          <button
            type="button"
            onClick={() => navigate('/bookings/new')}
            className="relative -top-3 w-13 h-13 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 border-4 border-card active:scale-95 transition-transform"
            aria-label="حجز جديد"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>

          {/* Tab 3: Cash Management */}
          <Link
            to="/cash"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200",
              isActive('/cash') 
                ? "text-primary font-black scale-105" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all",
              isActive('/cash') ? "bg-primary/10 text-primary" : ""
            )}>
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-bold">الخزينة</span>
          </Link>

          {/* Tab 4: More Drawer */}
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200",
              showMore ? "text-primary font-black scale-105" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="p-1.5 rounded-xl">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-bold">المزيد</span>
          </button>

        </div>
      </div>

      {/* iOS Slide-up More Sheet */}
      <Dialog open={showMore} onOpenChange={setShowMore}>
        <DialogContent className="sm:max-w-md p-5 glass-card border-border rounded-t-3xl sm:rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-base font-black flex items-center gap-2 text-foreground">
              <Crown className="w-5 h-5 text-amber-500" />
              خدمات وأقسام النظام
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2 pt-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.98]",
                    active
                      ? "bg-primary/10 border-primary/30 text-primary font-bold"
                      : "bg-muted/30 border-border/60 hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-amber-500 border-border"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
