import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, Wallet, Building2, 
  Receipt, BarChart3, ChevronRight, Menu, X, Crown, Settings, FileText, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/bookings', label: 'الحجوزات', icon: Calendar },
  { path: '/cash', label: 'الخزينة', icon: Wallet },
  { path: '/bank', label: 'البنك', icon: Building2 },
  { path: '/expenses', label: 'المصروفات', icon: Receipt },
  { path: '/reports', label: 'التقارير', icon: BarChart3 },
  { path: '/pending-payments', label: 'المطالبات', icon: AlertCircle },
  { path: '/customer-statement', label: 'كشف حساب', icon: FileText },
  { path: '/admin', label: 'الإعدادات', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const visibleItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Crown className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">ريفيرا</h1>
            <p className="text-xs text-sidebar-foreground/60">نظام إدارة القاعة</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 select-none",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 mr-auto rotate-180" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-sidebar-foreground/60 font-medium">المظهر</span>
          <ThemeToggle className="bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/70" />
        </div>
        <div className="px-4 py-3 rounded-xl bg-sidebar-accent/50">
          <p className="text-xs text-sidebar-foreground/60">الإصدار 1.0</p>
          <p className="text-xs text-sidebar-foreground/40 mt-1">© 2026 ريفيرا</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div className="lg:hidden fixed top-4 left-4 z-50">
        <ThemeToggle />
      </div>

      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "lg:hidden fixed top-0 right-0 h-full w-72 bg-sidebar z-40 transition-transform duration-300 shadow-2xl",
        mobileOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      <aside className="hidden lg:block fixed top-0 right-0 h-screen w-64 bg-sidebar border-l border-sidebar-border">
        {sidebarContent}
      </aside>
    </>
  );
}