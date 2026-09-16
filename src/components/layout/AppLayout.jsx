import React from 'react';
import { Outlet } from 'react-router-dom';
import LuxuryNavbar from './LuxuryNavbar';
import InteractiveDockNav from './InteractiveDockNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-amber-200">
      {/* Top Clean Executive Header */}
      <LuxuryNavbar />

      {/* Main Content: Full-Width Luxurious Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 sm:pb-36 animate-in fade-in duration-300">
        <Outlet />
      </main>

      {/* Interactive Bottom Scroll Dock Navigation */}
      <InteractiveDockNav />
    </div>
  );
}