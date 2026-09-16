import React from 'react';
import { Outlet } from 'react-router-dom';
import LuxuryNavbar from './LuxuryNavbar';
import IPhoneBottomNav from './IPhoneBottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-amber-200">
      {/* Top Luxury Navbar (Desktop / Tablet / Mobile Header) */}
      <LuxuryNavbar />

      {/* Main App Content: Full Width with Max Constraint */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-12 animate-in fade-in duration-300">
        <Outlet />
      </main>

      {/* iOS Style Bottom Floating Navigation (Mobile & iPhone) */}
      <IPhoneBottomNav />
    </div>
  );
}