import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, Calendar, Wallet, Building2, 
  Receipt, BarChart3, Settings, FileText, AlertCircle, 
  Plus, CheckCircle2, Menu, X, Sparkles, User, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const navLinks = [
  { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/bookings', label: 'الحجوزات والعقود', icon: Calendar },
  { path: '/cash', label: 'الخزينة النقدية', icon: Wallet },
  { path: '/bank', label: 'الحسابات البنكية', icon: Building2 },
  { path: '/expenses', label: 'المصروفات', icon: Receipt },
  { path: '/pending-payments', label: 'المطالبات', icon: AlertCircle },
  { path: '/customer-statement', label: 'كشف حساب', icon: FileText },
  { path: '/reports', label: 'التقارير', icon: BarChart3 },
  { path: '/admin', label: 'الإعدادات', icon: Settings, adminOnly: true },
];

export default function LuxuryNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  const visibleLinks = navLinks.filter(item => !item.adminOnly || user?.role === 'admin');

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const logoSrc = hallSettings.logo_url || './logo.png';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/90 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Right Brand: Logo & Title */}
          <Link to="/" className="flex items-center gap-3 group select-none flex-shrink-0">
            <div className="relative">
              <img 
                src={logoSrc} 
                alt="قمة الريف" 
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-xl bg-white p-1 border border-border shadow-sm group-hover:scale-105 transition-transform"
                onError={(e) => { e.target.src = './logo.png'; }}
              />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card"></span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {hallSettings.hall_name || 'قاعة قمة الريف'}
                </span>
                <Badge variant="outline" className="hidden xl:inline-flex bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-1.5 py-0">
                  حسابات
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold">
                نظام إدارة وحسابات المناسبات
              </p>
            </div>
          </Link>

          {/* Center Navigation Tabs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 overflow-x-auto py-1 px-2 rounded-2xl bg-muted/40 border border-border/50">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs xl:text-sm font-bold transition-all duration-200 whitespace-nowrap",
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  <Icon className={cn("w-4 h-4", active ? "text-primary-foreground" : "text-amber-500/80")} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Left Actions: New Booking + Theme + Mobile toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={() => navigate('/bookings/new')}
              size="sm"
              className="hidden sm:inline-flex bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-md shadow-amber-500/20 text-xs px-3.5 h-9"
            >
              <Plus className="w-4 h-4 ml-1" /> حجز جديد
            </Button>

            <ThemeToggle className="h-9 w-9 rounded-xl bg-muted/60 hover:bg-muted" />

            {/* Mobile Expand Menu Button */}
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden h-9 w-9 rounded-xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu (for tablet/phone top drawer) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card p-4 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold transition-all border",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/30 text-foreground border-border/60 hover:bg-muted"
                  )}
                >
                  <Icon className={cn("w-4 h-4", active ? "text-primary-foreground" : "text-amber-500")} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> قاعدة البيانات متصلة
            </span>
            <span className="font-mono text-[10px]">نظام قمة الريف</span>
          </div>
        </div>
      )}
    </header>
  );
}
