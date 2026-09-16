import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import IOSInstallPrompt from '@/components/IOSInstallPrompt';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Bookings from '@/pages/Bookings';
import BookingFormPage from '@/pages/BookingFormPage';
import BookingDetailsPage from '@/pages/BookingDetailsPage';
import CashManagement from '@/pages/CashManagement';
import BankManagement from '@/pages/BankManagement';
import Expenses from '@/pages/Expenses';
import Reports from '@/pages/Reports';
import AdminSettings from '@/pages/AdminSettings';
import CustomerStatement from '@/pages/CustomerStatement';
import PendingPayments from '@/pages/PendingPayments';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-muted border-t-accent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground font-cairo">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/new" element={<BookingFormPage />} />
        <Route path="/bookings/:id" element={<BookingDetailsPage />} />
        <Route path="/bookings/:id/edit" element={<BookingFormPage />} />
        <Route path="/cash" element={<CashManagement />} />
        <Route path="/bank" element={<BankManagement />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin" element={<AdminSettings />} />
        <Route path="/customer-statement" element={<CustomerStatement />} />
        <Route path="/pending-payments" element={<PendingPayments />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
        <Router basename={import.meta.env.BASE_URL || '/'}>
          <AuthenticatedApp />
        </Router>
        <IOSInstallPrompt />
        <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App