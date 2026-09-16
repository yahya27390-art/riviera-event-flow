import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, Calendar, Wallet, Building2, 
  Receipt, BarChart3, ChevronRight, Menu, X, Crown, Settings, FileText, AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/bookings', label: 'الحجوزات والعقود', icon: Calendar },
  { path: '/cash', label: 'الخزينة النقدية', icon: Wallet },
  { path: '/bank', label: 'الحسابات البنكية', icon: Building2 },
  { path: '/expenses', label: 'المصروفات', icon: Receipt },
  { path: '/pending-payments', label: 'المطالبات والتحصيل', icon: AlertCircle },
  { path: '/customer-statement', label: 'كشف حساب عميل', icon: FileText },
  { path: '/reports', label: 'التقارير المالية', icon: BarChart3 },
  { path: '/admin', label: 'إعدادات النظام', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  
  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  const visibleItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3">
          {hallSettings.logo_url ? (
            <img 
              src={hallSettings.logo_url} 
              alt="Logo" 
              className="w-11 h-11 rounded-xl object-contain bg-white p-1 border border-sidebar-border shadow-md"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-900 font-bold">
              <Crown className="w-6 h-6 text-slate-950" />
            </div>
          )}
          <div className="overflow-hidden">
            <h1 className="text-base font-extrabold text-sidebar-foreground truncate">
              {hallSettings.hall_name || 'قاعة قمة الريف'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[11px] font-medium text-sidebar-foreground/70">نظام إدارة المناسبات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-transform group-hover:scale-110", active ? "text-slate-950" : "text-amber-400/90")} />
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 mr-auto rotate-180 text-slate-950" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer & User badge */}
      <div className="p-4 border-t border-sidebar-border/60 space-y-3 bg-sidebar-background/50">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-amber-400 border border-sidebar-border">
              {user?.full_name?.charAt(0) || 'م'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-sidebar-foreground truncate">{user?.full_name || 'مدير النظام'}</p>
              <p className="text-[10px] text-amber-400 font-medium">صلاحية كاملة</p>
            </div>
          </div>
          <ThemeToggle className="bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 h-8 w-8 rounded-lg" />
        </div>

        <div className="px-3 py-2 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/50 flex items-center justify-between text-[11px] text-sidebar-foreground/60">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            قاعدة البيانات متصلة
          </span>
          <span className="font-mono text-[10px]">v2.0 PRO</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 right-3 z-50 p-2.5 bg-primary text-primary-foreground rounded-xl shadow-xl border border-white/10 backdrop-blur-md"
        aria-label="القائمة"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm animate-in fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "lg:hidden fixed top-0 right-0 h-full w-72 bg-sidebar z-40 transition-transform duration-300 shadow-2xl border-l border-sidebar-border",
        mobileOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      <aside className="hidden lg:block fixed top-0 right-0 h-screen w-64 bg-sidebar border-l border-sidebar-border/80 shadow-lg z-30">
        {sidebarContent}
      </aside>
    </>
  );
}