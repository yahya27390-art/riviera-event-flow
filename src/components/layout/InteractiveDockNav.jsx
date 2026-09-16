import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, Calendar, Wallet, Building2, 
  Receipt, BarChart3, Settings, FileText, AlertCircle, 
  Plus, ChevronRight, ChevronLeft, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { 
    path: '/', 
    label: 'الرئيسية', 
    fullLabel: 'لوحة التحكم',
    icon: LayoutDashboard,
    color: 'from-emerald-500 to-teal-700',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    activeBorder: 'border-emerald-500/80',
    desc: 'مؤشرات الأرباح والسيولة والحجوزات'
  },
  { 
    path: '/bookings', 
    label: 'الحجوزات', 
    fullLabel: 'الحجوزات والعقود',
    icon: Calendar,
    color: 'from-amber-400 via-amber-500 to-amber-600',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    activeBorder: 'border-amber-500/80',
    desc: 'التقويم التفاعلي والعقود والمناسبات'
  },
  { 
    path: '/cash', 
    label: 'الخزينة', 
    fullLabel: 'الخزينة النقدية (الكاش)',
    icon: Wallet,
    color: 'from-emerald-600 to-green-700',
    glowColor: 'rgba(5, 150, 105, 0.4)',
    activeBorder: 'border-emerald-600/80',
    desc: 'حركة الصندوق والمقبوضات اليومية'
  },
  { 
    path: '/bank', 
    label: 'البنوك', 
    fullLabel: 'الحسابات البنكية',
    icon: Building2,
    color: 'from-blue-500 to-indigo-600',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    activeBorder: 'border-blue-500/80',
    desc: 'سجل التحويلات وشبكات مدى'
  },
  { 
    path: '/expenses', 
    label: 'المصروفات', 
    fullLabel: 'المصروفات التشغيلية',
    icon: Receipt,
    color: 'from-rose-500 to-red-600',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    activeBorder: 'border-rose-500/80',
    desc: 'فواتير وصيانة ورواتب القاعة'
  },
  { 
    path: '/pending-payments', 
    label: 'المطالبات', 
    fullLabel: 'المطالبات والتحصيل',
    icon: AlertCircle,
    color: 'from-orange-500 to-amber-600',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    activeBorder: 'border-orange-500/80',
    desc: 'متابعة وتذكير المبالغ المتبقية عبر واتساب',
    hasBadge: true
  },
  { 
    path: '/customer-statement', 
    label: 'كشف حساب', 
    fullLabel: 'كشف حساب عميل',
    icon: FileText,
    color: 'from-purple-500 to-violet-700',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    activeBorder: 'border-purple-500/80',
    desc: 'سجل الحسابات والتعاملات للعملاء'
  },
  { 
    path: '/reports', 
    label: 'التقارير', 
    fullLabel: 'التقارير والإحصائيات',
    icon: BarChart3,
    color: 'from-teal-500 to-cyan-600',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    activeBorder: 'border-teal-500/80',
    desc: 'تحليل الإيرادات ونسب الإشغال'
  },
  { 
    path: '/admin', 
    label: 'الإعدادات', 
    fullLabel: 'إعدادات النظام',
    icon: Settings,
    color: 'from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700',
    glowColor: 'rgba(100, 116, 139, 0.4)',
    activeBorder: 'border-slate-500/80',
    desc: 'بيانات القاعة وترحيل قاعدة البيانات',
    adminOnly: true
  },
];

export default function InteractiveDockNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Fetch pending bookings count for notification badge
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list(),
  });
  const pendingCount = bookings.filter(b => b.status !== 'ملغي' && (b.remaining_amount || 0) > 0).length;

  const visibleItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      // In RTL: scrollLeft is negative or positive depending on browser implementation
      const maxScroll = scrollWidth - clientWidth;
      const absScroll = Math.abs(scrollLeft);
      setCanScrollLeft(absScroll < maxScroll - 5);
      setCanScrollRight(absScroll > 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <nav 
      className="fixed bottom-3 sm:bottom-5 inset-x-0 z-50 flex justify-center pointer-events-none px-2 sm:px-4"
      aria-label="شريط الملاحة التفاعلي"
    >
      <div className="pointer-events-auto relative max-w-4xl w-full flex items-center justify-center">
        
        {/* Dock Main Glass Container */}
        <div className="w-full relative flex items-center bg-card/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-white/40 dark:border-slate-800/80 shadow-[0_12px_45px_rgba(0,0,0,0.22)] rounded-3xl p-1.5 sm:p-2 transition-all duration-300">
          
          {/* Subtle Right Scroll Button (for RTL start) */}
          {canScrollRight && (
            <button
              onClick={() => handleScroll('right')}
              className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card/95 dark:bg-slate-800 border border-border shadow-md items-center justify-center text-foreground hover:scale-110 active:scale-95 transition-all"
              aria-label="تمرير لليمين"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Interactive Scrollable Track */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex items-center justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full px-1 py-1"
          >
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const isHovered = hoveredItem === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "group relative flex flex-col items-center justify-center min-w-[62px] sm:min-w-[76px] px-2 py-1.5 sm:py-2 rounded-2xl transition-all duration-300 select-none flex-shrink-0",
                    active
                      ? "bg-primary/10 dark:bg-primary/20 scale-105 shadow-inner"
                      : "hover:bg-muted/70 hover:scale-105 hover:-translate-y-1"
                  )}
                  style={{
                    boxShadow: active ? `0 0 15px ${item.glowColor}` : undefined
                  }}
                >
                  {/* Dynamic Active Top Indicator */}
                  {active && (
                    <span 
                      className="absolute -top-1 w-6 h-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-sm"
                    />
                  )}

                  {/* Icon Box with Custom Category Gradient */}
                  <div className="relative">
                    <div 
                      className={cn(
                        "w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white shadow-md transition-all duration-300",
                        `bg-gradient-to-br ${item.color}`,
                        active 
                          ? "ring-2 ring-amber-400/80 shadow-lg scale-105" 
                          : "group-hover:shadow-lg group-hover:scale-110"
                      )}
                    >
                      <Icon className="w-5 h-5 sm:w-5 sm:h-5 stroke-[2.2]" />
                    </div>

                    {/* Pending Badge on المطالبات */}
                    {item.hasBadge && pendingCount > 0 && (
                      <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-card shadow animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span className={cn(
                    "text-[11px] sm:text-xs font-bold mt-1 tracking-tight transition-colors line-clamp-1 text-center",
                    active 
                      ? "text-primary dark:text-emerald-400 font-black" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.label}
                  </span>

                  {/* Interactive Tooltip on Hover (Desktop) */}
                  {isHovered && (
                    <div className="hidden lg:block absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-950/95 text-white text-[11px] font-semibold py-1 px-2.5 rounded-xl shadow-xl border border-white/10 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{item.fullLabel}</span>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 rotate-45 border-r border-b border-white/10"></div>
                    </div>
                  )}
                </Link>
              );
            })}

            {/* Quick Action (+) Button inside Dock */}
            <button
              type="button"
              onClick={() => navigate('/bookings/new')}
              className="group relative flex flex-col items-center justify-center min-w-[62px] sm:min-w-[76px] px-2 py-1.5 sm:py-2 rounded-2xl hover:bg-amber-500/10 hover:scale-105 hover:-translate-y-1 transition-all duration-300 select-none flex-shrink-0"
              title="حجز جديد"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-110 group-active:scale-95 transition-transform">
                <Plus className="w-6 h-6 stroke-[3]" />
              </div>
              <span className="text-[11px] sm:text-xs font-black mt-1 text-amber-600 dark:text-amber-400">
                حجز جديد
              </span>
            </button>
          </div>

          {/* Subtle Left Scroll Button (for RTL end) */}
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card/95 dark:bg-slate-800 border border-border shadow-md items-center justify-center text-foreground hover:scale-110 active:scale-95 transition-all"
              aria-label="تمرير لليسار"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

        </div>
      </div>
    </nav>
  );
}
