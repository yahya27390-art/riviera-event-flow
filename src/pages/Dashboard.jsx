import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, Wallet, Building2, Receipt, TrendingUp, TrendingDown, 
  AlertTriangle, Clock, ArrowLeft, Plus, CreditCard, Sparkles, 
  Phone, MessageSquare, CheckCircle2, DollarSign, CalendarCheck
} from 'lucide-react';
import { gregorianToHijri } from '@/lib/hijri';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import InteractiveCalendar from '@/components/calendar/InteractiveCalendar';
import { Button } from '@/components/ui/button';
import QuickExpenseDialog from '@/components/dashboard/QuickExpenseDialog';
import QuickPaymentDialog from '@/components/dashboard/QuickPaymentDialog';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-created_at', 200) });
  const { data: cashTxns = [] } = useQuery({ queryKey: ['cashTransactions'], queryFn: () => base44.entities.CashTransaction.list('-created_at', 500) });
  const { data: bankTxns = [] } = useQuery({ queryKey: ['bankTransactions'], queryFn: () => base44.entities.BankTransaction.list('-created_at', 500) });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list('-created_at', 500) });
  const { data: settingsList = [] } = useQuery({ queryKey: ['hallSettings'], queryFn: () => base44.entities.HallSettings.list() });
  const hallSettings = settingsList[0] || {};
  
  const [showExpense, setShowExpense] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Financial Metrics Calculations
  const cashBalance = cashTxns.reduce((sum, t) => t.type === 'إيراد' ? sum + (Number(t.amount) || 0) : sum - (Number(t.amount) || 0), 0);
  const bankBalance = bankTxns.reduce((sum, t) => t.type === 'إيراد' ? sum + (Number(t.amount) || 0) : sum - (Number(t.amount) || 0), 0);
  const totalRevenue = [...cashTxns, ...bankTxns].filter(t => t.type === 'إيراد').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeBookings = bookings.filter(b => b.status !== 'ملغي');
  
  // Total pending receivables
  const totalRemaining = activeBookings.reduce((sum, b) => sum + (Number(b.remaining_amount) || 0), 0);

  const upcomingBookings = useMemo(() => activeBookings
    .filter(b => b.event_date && new Date(b.event_date) >= today)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 6), [bookings]);

  const outstandingAlerts = useMemo(() => activeBookings
    .filter(b => {
      if (!b.event_date || (Number(b.remaining_amount) || 0) <= 0) return false;
      const daysLeft = differenceInDays(new Date(b.event_date), today);
      return daysLeft >= 0 && daysLeft <= 30;
    })
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5), [bookings]);

  const monthlyData = useMemo(() => {
    const months = {};
    const allTxns = [...cashTxns, ...bankTxns];
    allTxns.forEach(t => {
      if (t.type === 'إيراد' && (t.transaction_date || t.created_at)) {
        const dateStr = (t.transaction_date || t.created_at).substring(0, 7);
        months[dateStr] = (months[dateStr] || 0) + (Number(t.amount) || 0);
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, amount]) => ({ month: month.substring(5), إيرادات: Math.round(amount) }));
  }, [cashTxns, bankTxns]);

  const getDaysLabel = (dateStr) => {
    const d = differenceInDays(new Date(dateStr), today);
    if (d === 0) return { label: 'اليوم', className: 'bg-rose-500/15 text-rose-600 border border-rose-200 dark:border-rose-800' };
    if (d === 1) return { label: 'غداً', className: 'bg-amber-500/15 text-amber-600 border border-amber-200 dark:border-amber-800' };
    if (d <= 7) return { label: `${d} أيام`, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900' };
    return { label: `${d} يوم`, className: 'bg-primary/10 text-primary border border-primary/20' };
  };

  const openWhatsAppReminder = (booking) => {
    if (!booking.customer_phone) return;
    const cleanPhone = booking.customer_phone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('966') ? cleanPhone : `966${cleanPhone.replace(/^0/, '')}`;
    const hallName = hallSettings.hall_name || 'قاعة قمة الريف';
    const message = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته\nالأستاذ/ة: ${booking.customer_name}\nنود تذكيركم بموعد مناسبتكم في ${hallName} بتاريخ ${booking.event_date} (${booking.event_date_hijri || gregorianToHijri(booking.event_date)} هـ).\nالمبلغ المتبقي: ${formatCurrency(booking.remaining_amount)}\nنسعد بخدمتكم دائماً!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Luxury Welcome & Quick Action Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            {hallSettings.logo_url ? (
              <img 
                src={hallSettings.logo_url} 
                alt="Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl bg-white/95 p-2 shadow-2xl border border-amber-400/30"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 text-2xl font-black shadow-2xl border border-amber-300">
                {(hallSettings.hall_name || 'ق').charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
                  {hallSettings.hall_name || 'قاعة قمة الريف ( ريفييرا سابقاً )'}
                </h1>
                <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 hover:bg-amber-400/30 text-[11px] font-semibold gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> فاخر
                </Badge>
              </div>
              <p className="text-emerald-200/80 text-xs sm:text-sm mt-1 font-medium">
                {format(new Date(), "EEEE، dd MMMM yyyy", { locale: ar })} • {gregorianToHijri(format(new Date(), 'yyyy-MM-dd'))} هـ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button 
              onClick={() => navigate('/bookings/new')}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 border-0"
              size="sm"
            >
              <Plus className="w-4 h-4 ml-1" /> حجز جديد
            </Button>
            <Button 
              onClick={() => setShowPayment(true)} 
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md"
              size="sm"
            >
              <CreditCard className="w-4 h-4 ml-1 text-amber-400" /> سداد دفعة
            </Button>
            <Button 
              onClick={() => setShowExpense(true)} 
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md"
              size="sm"
            >
              <Receipt className="w-4 h-4 ml-1 text-rose-400" /> مصروف جديد
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Animated KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Profit */}
        <Card className="glass-card luxury-card-hover border-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">صافي الأرباح</p>
                <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(netProfit)}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                  <span>إجمالي الإيرادات - المصروفات</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenues */}
        <Card className="glass-card luxury-card-hover border-amber-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">إجمالي الإيرادات المحصلة</p>
                <p className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">كاش + تحويلات بنكية</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="glass-card luxury-card-hover border-rose-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-rose-500"></div>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">إجمالي المصروفات</p>
                <p className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{expenses.length} حركة مصروف مسجلة</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Bookings & Pending Receivables */}
        <Card className="glass-card luxury-card-hover border-sky-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-sky-500"></div>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">المتبقي للتحصيل</p>
                <p className="text-2xl font-black mt-1 text-sky-600 dark:text-sky-400">
                  {formatCurrency(totalRemaining)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{activeBookings.length} حجز نشط</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center border border-sky-500/20">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liquidity Vault Overview */}
      <Card className="glass-card border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-500" /> أرصدة السيولة النقدية والبنكية (Liquidity Vault)
              </CardTitle>
              <CardDescription className="text-xs">
                متابعة المبالغ المتوفرة في الصندوق النقدي والحساب البنكي
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Link to="/cash">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  سجل الخزينة <ArrowLeft className="w-3 h-3 mr-1" />
                </Button>
              </Link>
              <Link to="/bank">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  حسابات البنك <ArrowLeft className="w-3 h-3 mr-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cash Box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">رصيد الخزينة (كاش الصندوق)</p>
                </div>
                <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-2">
                  {formatCurrency(cashBalance)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            {/* Bank Box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/20 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <p className="text-xs font-bold text-sky-800 dark:text-sky-300">رصيد الحساب البنكي والشبكات</p>
                </div>
                <p className="text-2xl font-black text-sky-950 dark:text-sky-100 mt-2">
                  {formatCurrency(bankBalance)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-600">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Calendar Component */}
      <InteractiveCalendar bookings={activeBookings} />

      {/* Chart + Upcoming Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue Chart */}
        <Card className="glass-card lg:col-span-3 border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> حركة الإيرادات الشهرية
            </CardTitle>
            <CardDescription className="text-xs">
              مقارنة المتحصلات المالية خلال الأشهر الأخيرة
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(v) => [formatCurrency(v), 'الإيرادات']} 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))', 
                      fontFamily: 'Cairo',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Bar dataKey="إيرادات" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground text-sm">
                <Receipt className="w-8 h-8 mb-2 opacity-30" />
                <p>لا توجد بيانات إيرادات مسجلة بعد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="glass-card lg:col-span-2 border-border/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> الحجوزات القادمة
              </CardTitle>
              <Link to="/bookings" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                الكل <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {upcomingBookings.length > 0 ? upcomingBookings.map(b => {
              const daysInfo = getDaysLabel(b.event_date);
              return (
                <div 
                  key={b.id} 
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all border border-border/40 hover:border-primary/30"
                >
                  <div className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${daysInfo.className}`}>
                    {daysInfo.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{b.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.event_type} • {b.event_date_hijri || gregorianToHijri(b.event_date)} هـ
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {b.customer_phone && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                        onClick={() => openWhatsAppReminder(b)}
                        title="مراسلة واتساب"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    )}
                    <Link to={`/bookings/${b.id}`}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-sm text-muted-foreground py-12 flex flex-col items-center justify-center">
                <Calendar className="w-8 h-8 mb-2 opacity-30" />
                <p>لا توجد حجوزات قادمة مجدولة</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Alerts Section */}
      <Card className="glass-card border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base font-bold">تنبيهات استحقاق الدفعات (المطالبات العاجلة)</CardTitle>
              {outstandingAlerts.length > 0 && (
                <Badge variant="destructive" className="text-xs rounded-full px-2">
                  {outstandingAlerts.length} مستحق
                </Badge>
              )}
            </div>
            <Link to="/pending-payments">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1">
                إدارة كافة المطالبات <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {outstandingAlerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {outstandingAlerts.map(b => {
                const daysLeft = differenceInDays(new Date(b.event_date), today);
                const urgencyBg = daysLeft <= 3 ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900' : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900';
                return (
                  <div key={b.id} className={`p-3.5 rounded-xl border ${urgencyBg} flex flex-col justify-between gap-3`}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm">{b.customer_name}</p>
                        <Badge variant="outline" className="text-[10px] bg-white/80 dark:bg-black/40">
                          باقي {daysLeft} يوم
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {b.event_type} • {b.event_date}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">المبلغ المتبقي</span>
                        <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                          {formatCurrency(b.remaining_amount)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                        onClick={() => openWhatsAppReminder(b)}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        تذكير واتساب
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center justify-center">
              <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500 opacity-60" />
              <p className="font-semibold text-foreground">جميع الحجوزات القريبة مسددة بالكامل</p>
              <p className="text-xs mt-0.5">لا توجد مبالغ متأخرة للأفراح والمناسبات القادمة</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Dialogs */}
      {showExpense && <QuickExpenseDialog open={showExpense} onClose={() => setShowExpense(false)} />}
      {showPayment && <QuickPaymentDialog open={showPayment} onClose={() => setShowPayment(false)} />}
    </div>
  );
}