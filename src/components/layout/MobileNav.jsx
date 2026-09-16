import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Wallet, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { path: '/bookings', label: 'الحجوزات', icon: Calendar },
  { path: '/cash', label: 'المالية', icon: Wallet },
  { path: '/reports', label: 'التقارير', icon: BarChart3 },
  { path: '/admin', label: 'الإعدادات', icon: Settings, adminOnly: true },
];

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const visibleItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg select-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
      <div className={cn("grid", visibleItems.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
        {visibleItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 transition-colors select-none",
                active ? "text-accent" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}