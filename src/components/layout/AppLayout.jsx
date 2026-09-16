import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import FloatingActionButton from './FloatingActionButton';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:mr-64 min-h-screen pb-20 lg:pb-0">
        <div className="p-4 md:p-6 lg:p-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
      <MobileNav />
      <FloatingActionButton />
    </div>
  );
}