import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, CheckCircle2, Sparkles, CreditCard, Receipt, CalendarClock, ShieldCheck,
  User, Lock, LogOut, KeyRound, ChevronDown, ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { gregorianToHijri } from '@/lib/hijri';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';

export default function LuxuryNavbar() {
  const navigate = useNavigate();
  const { user, logout, lockSessionNow } = useAuth();
  const [showChangePassModal, setShowChangePassModal] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  const todayGreg = format(new Date(), 'yyyy-MM-dd');
  const hijriStr = gregorianToHijri(todayGreg);
  const formattedGreg = format(new Date(), 'EEEE، dd MMMM yyyy', { locale: ar });

  const logoSrc = hallSettings.logo_url || './logo-gold.jpg';

  const isUserAdmin = user?.role === 'admin';

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-sm transition-colors"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Right Brand: Official Luxury Logo & Name */}
          <Link to="/" className="flex items-center gap-3 group select-none flex-shrink-0">
            <div className="relative">
              <img 
                src={logoSrc} 
                alt="قمة الريف" 
                className="w-10 h-10 sm:w-13 sm:h-13 object-contain rounded-2xl bg-white p-1 border border-border/80 shadow-md group-hover:scale-105 transition-transform"
                onError={(e) => { e.target.src = './logo.png'; }}
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card shadow-sm animate-pulse"></span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-xl text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {hallSettings.hall_name || 'قاعة قمة الريف'}
                </span>
                <Badge variant="outline" className="hidden sm:inline-flex bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-2 py-0.5">
                  حسابات ومناسبات
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                نظام إدارة وحسابات القاعة
              </p>
            </div>
          </Link>

          {/* Center Date & Status Indicator (Desktop/Tablet) */}
          <div className="hidden md:flex flex-col items-center justify-center px-4 py-1.5 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <CalendarClock className="w-4 h-4 text-amber-500" />
              <span>{formattedGreg}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{hijriStr} هـ</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>قاعدة البيانات متصلة وجاهزة</span>
            </div>
          </div>

          {/* Left Actions: Quick Actions + User Menu + Theme */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Quick Actions (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5">
              <Button
                onClick={() => navigate('/pending-payments')}
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-bold border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1.5 rounded-xl"
              >
                <CreditCard className="w-3.5 h-3.5" /> سداد دفعة
              </Button>

              <Button
                onClick={() => navigate('/expenses')}
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-bold border-rose-500/30 hover:bg-rose-500/10 text-rose-700 dark:text-rose-300 gap-1.5 rounded-xl"
              >
                <Receipt className="w-3.5 h-3.5" /> تسجيل مصروف
              </Button>
            </div>

            {/* Primary Action Button: New Booking */}
            <Button
              onClick={() => navigate('/bookings/new')}
              size="sm"
              className="bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-md shadow-amber-500/20 text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10 rounded-xl"
            >
              <Plus className="w-4 h-4 ml-1 stroke-[3]" /> حجز جديد
            </Button>

            {/* User Profile & Security Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-muted/60 hover:bg-muted border border-border/70 transition-colors">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${
                    isUserAdmin 
                      ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950' 
                      : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                  }`}>
                    {user?.full_name ? user.full_name.charAt(0) : 'U'}
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-black text-foreground truncate max-w-[100px]">
                      {user?.full_name || 'مستخدم النظام'}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-semibold">
                      {isUserAdmin ? 'مدير نظام 👑' : 'محاسب مالي 💼'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60 rounded-3xl p-2 font-cairo shadow-2xl bg-card border-border/80">
                <DropdownMenuLabel className="p-3 text-right">
                  <div className="text-xs font-black text-foreground">{user?.full_name || 'المستخدم'}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">{user?.email}</div>
                  <div className="mt-2">
                    <Badge variant="outline" className={`text-[10px] font-bold ${
                      isUserAdmin 
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' 
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    }`}>
                      {isUserAdmin ? 'صلاحية كاملة (مدير نظام 👑)' : 'صلاحية تشغيلية (محاسب مالي 💼)'}
                    </Badge>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Change Password */}
                <DropdownMenuItem 
                  onClick={() => setShowChangePassModal(true)}
                  className="cursor-pointer gap-2 p-2.5 rounded-xl text-xs font-bold text-foreground focus:bg-amber-500/10 focus:text-amber-600"
                >
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>تغيير رمز المرور الخاص بي</span>
                </DropdownMenuItem>

                {/* Lock Screen */}
                <DropdownMenuItem 
                  onClick={() => lockSessionNow()}
                  className="cursor-pointer gap-2 p-2.5 rounded-xl text-xs font-bold text-foreground focus:bg-muted"
                >
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>قفل الشاشة فوراً</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem 
                  onClick={() => logout(true)}
                  className="cursor-pointer gap-2 p-2.5 rounded-xl text-xs font-bold text-rose-500 focus:bg-rose-500/10 focus:text-rose-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Switcher */}
            <ThemeToggle className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-muted/60 hover:bg-muted" />

          </div>

        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={showChangePassModal} 
        onOpenChange={setShowChangePassModal} 
      />
    </header>
  );
}
