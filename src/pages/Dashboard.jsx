import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Wallet, Building2, Receipt, TrendingUp, TrendingDown, AlertTriangle, Clock, ArrowLeft, Plus, CreditCard } from 'lucide-react';
import { gregorianToHijri } from '@/lib/hijri';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import InteractiveCalendar from '@/components/calendar/InteractiveCalendar';
import { Button } from '@/components/ui/button';
import QuickExpenseDialog from '@/components/dashboard/QuickExpenseDialog';
import QuickPaymentDialog from '@/components/dashboard/QuickPaymentDialog';

export default function Dashboard() {
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-created_date', 200) });
  const { data: cashTxns = [] } = useQuery({ queryKey: ['cashTransactions'], queryFn: () => base44.entities.CashTransaction.list('-created_date', 500) });
  const { data: bankTxns = [] } = useQuery({ queryKey: ['bankTransactions'], queryFn: () => base44.entities.BankTransaction.list('-created_date', 500) });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list('-created_date', 500) });
  const { data: settingsList = [] } = useQuery({ queryKey: ['hallSettings'], queryFn: () => base44.entities.HallSettings.list() });
  const hallSettings = settingsList[0] || {};
  const [showExpense, setShowExpense] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const cashBalance = cashTxns.reduce((sum, t) => t.type === 'إيراد' ? sum + (t.amount || 0) : sum - (t.amount || 0), 0);
  const bankBalance = bankTxns.reduce((sum, t) => t.type === 'إيراد' ? sum + (t.amount || 0) : sum - (t.amount || 0), 0);
  const totalRevenue = [...cashTxns, ...bankTxns].filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeBookings = bookings.filter(b => b.status !== 'ملغي');
  const upcomingBookings = useMemo(() => activeBookings
    .filter(b => b.event_date && new Date(b.event_date) >= today)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 6), [bookings]);

  // Outstanding balances - clients who haven't paid in full and event is within 30 days
  const outstandingAlerts = useMemo(() => activeBookings
    .filter(b => {
      if (!b.event_date || (b.remaining_amount || 0) <= 0) return false;
      const daysLeft = differenceInDays(new Date(b.event_date), today);
      return daysLeft >= 0 && daysLeft <= 30;
    })
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5), [bookings]);

  const monthlyData = useMemo(() => {
    const months = {};
    const allTxns = [...cashTxns, ...bankTxns];
    allTxns.forEach(t => {
      if (t.type === 'إيراد' && t.transaction_date) {
        const month = t.transaction_date.substring(0, 7);
        months[month] = (months[month] || 0) + (t.amount || 0);
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, amount]) => ({ month: month.substring(5), إيرادات: Math.round(amount) }));
  }, [cashTxns, bankTxns]);

  const getDaysLabel = (dateStr) => {
    const d = differenceInDays(new Date(dateStr), today);
    if (d === 0) return { label: 'اليوم', className: 'bg-red-100 text-red-700' };
    if (d === 1) return { label: 'غداً', className: 'bg-orange-100 text-orange-700' };
    if (d <= 7) return { label: `${d} أيام`, className: 'bg-amber-100 text-amber-700' };
    return { label: `${d} يوم`, className: 'bg-blue-100 text-blue-700' };
  };

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          {hallSettings.logo_url ? (
            <img src={hallSettings.logo_url} alt="لوجو القاعة" className="w-16 h-16 object-contain rounded-xl border border-border shadow-sm bg-white p-1" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-sm">
              {(hallSettings.hall_name || 'ق').charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{hallSettings.hall_name || 'قاعة ريفيرا'}</h1>
            <p className="text-muted-foreground text-sm mt-1">{format(new Date(), "EEEE، dd MMMM yyyy", { locale: ar })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowExpense(true)} variant="outline" size="sm">
            <Plus className="w-4 h-4 ml-1" /> مصروف جديد
          </Button>
          <Button onClick={() => setShowPayment(true)} size="sm">
            <CreditCard className="w-4 h-4 ml-1" /> سداد دفعة
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-xl">
            <Calendar className="w-4 h-4" />
            <span>{upcomingBookings.length} حجز قادم</span>
          </div>
        </div>
      </div>

      {/* Interactive Calendar */}
      <InteractiveCalendar bookings={activeBookings} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-primary-foreground/70 text-xs mb-1">إجمالي الإيرادات</p>
                <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-600 to-red-500 text-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs mb-1">إجمالي المصروفات</p>
                <p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-white/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-500 text-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs mb-1">صافي الربح</p>
                <p className="text-xl font-bold">{formatCurrency(netProfit)}</p>
              </div>
              <Receipt className="w-8 h-8 text-white/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-400 text-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs mb-1">الحجوزات النشطة</p>
                <p className="text-xl font-bold">{activeBookings.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-white/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Upcoming Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-sm lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">الإيرادات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [formatCurrency(v), 'الإيرادات']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontFamily: 'Cairo' }} />
                  <Bar dataKey="إيرادات" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">لا توجد بيانات بعد</div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming bookings compact */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" /> الحجوزات القادمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingBookings.length > 0 ? upcomingBookings.map(b => {
              const daysInfo = getDaysLabel(b.event_date);
              return (
                <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${daysInfo.className}`}>
                    {daysInfo.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{b.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{b.event_type} • {b.event_date_hijri || gregorianToHijri(b.event_date)}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-sm text-muted-foreground py-8">لا توجد حجوزات قادمة</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Alerts + Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment alerts */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> تنبيهات المطالبات
              {outstandingAlerts.length > 0 && (
                <Badge variant="destructive" className="text-xs">{outstandingAlerts.length}</Badge>
              )}
              <Link to="/pending-payments" className="mr-auto text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outstandingAlerts.length > 0 ? (
              <div className="space-y-3">
                {outstandingAlerts.map(b => {
                  const daysLeft = differenceInDays(new Date(b.event_date), today);
                  const urgency = daysLeft <= 3 ? 'border-red-200 bg-red-50' : daysLeft <= 7 ? 'border-amber-200 bg-amber-50' : 'border-yellow-100 bg-yellow-50';
                  return (
                    <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl border ${urgency}`}>
                      <div>
                        <p className="font-semibold text-sm">{b.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.event_type} • {b.event_date_hijri || gregorianToHijri(b.event_date)} هـ
                          {' '}• باقي {daysLeft} يوم
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-red-600">{formatCurrency(b.remaining_amount)}</p>
                        <p className="text-xs text-muted-foreground">متبقي</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                لا توجد مطالبات مستحقة قريباً
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balances */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Wallet className="w-8 h-8 text-white/30" />
                <p className="text-white/60 text-xs">رصيد الخزينة</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(cashBalance)}</p>
              <p className="text-white/50 text-xs mt-1">نقدي في الصندوق</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-800 to-blue-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Building2 className="w-8 h-8 text-white/30" />
                <p className="text-white/60 text-xs">رصيد البنك</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(bankBalance)}</p>
              <p className="text-white/50 text-xs mt-1">الحساب البنكي</p>
            </CardContent>
          </Card>
        </div>
      </div>
      {showExpense && <QuickExpenseDialog open={showExpense} onClose={() => setShowExpense(false)} />}
      {showPayment && <QuickPaymentDialog open={showPayment} onClose={() => setShowPayment(false)} />}
    </div>
  );
}