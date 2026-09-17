import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, TrendingDown, Wallet, Building2, BarChart3, CheckCircle, XCircle, Printer } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { openPrintWindow } from '@/lib/printReport';
import { gregorianToHijri } from '@/lib/hijri';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import {
  buildFinancialPage,
  buildBookingsPage,
  buildExpensesPage,
  buildOccupancyPage,
  buildCashPage,
  buildBankPage,
} from '@/components/print/ReportPageBuilder';

function showDate(dateStr, hijriStr) {
  if (!dateStr) return '-';
  const greg = format(new Date(dateStr), 'dd/MM/yyyy');
  const hijri = hijriStr || gregorianToHijri(dateStr);
  return (
    <div>
      <div className="font-bold text-xs text-foreground">{hijri} هـ</div>
      <div className="text-[11px] text-muted-foreground font-mono">({greg} م)</div>
    </div>
  );
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [expenseFilter, setExpenseFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('financial');
  const [dateFromHijri, setDateFromHijri] = useState(gregorianToHijri(format(startOfMonth(new Date()), 'yyyy-MM-dd')));
  const [dateToHijri, setDateToHijri] = useState(gregorianToHijri(format(endOfMonth(new Date()), 'yyyy-MM-dd')));

  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-created_date', 500) });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list('-created_date', 500) });
  const { data: cashTxns = [] } = useQuery({ queryKey: ['cashTransactions'], queryFn: () => base44.entities.CashTransaction.list('-created_date', 1000) });
  const { data: bankTxns = [] } = useQuery({ queryKey: ['bankTransactions'], queryFn: () => base44.entities.BankTransaction.list('-created_date', 1000) });
  const { data: settingsList = [] } = useQuery({ queryKey: ['hallSettings'], queryFn: () => base44.entities.HallSettings.list() });
  const hallSettings = settingsList[0] || {};

  const filteredBookings = useMemo(() => bookings.filter(b =>
    b.event_date && b.event_date >= dateFrom && b.event_date <= dateTo
  ), [bookings, dateFrom, dateTo]);

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    if (!e.expense_date) return false;
    return e.expense_date >= dateFrom && e.expense_date <= dateTo &&
      (expenseFilter === 'all' || e.expense_type === expenseFilter);
  }), [expenses, dateFrom, dateTo, expenseFilter]);

  const filteredCash = useMemo(() => cashTxns.filter(t =>
    t.transaction_date && t.transaction_date >= dateFrom && t.transaction_date <= dateTo
  ), [cashTxns, dateFrom, dateTo]);

  const filteredBank = useMemo(() => bankTxns.filter(t =>
    t.transaction_date && t.transaction_date >= dateFrom && t.transaction_date <= dateTo
  ), [bankTxns, dateFrom, dateTo]);

  const occupancyData = useMemo(() => {
    const days = eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(dateTo) });
    const booked = filteredBookings.filter(b => b.status !== 'ملغي');
    const busy = days.filter(day => booked.some(b => b.event_date && isSameDay(parseISO(b.event_date), day)));
    return { total: days.length, busy: busy.length, free: days.length - busy.length, rate: days.length > 0 ? ((busy.length / days.length) * 100).toFixed(1) : 0, bookedList: booked };
  }, [filteredBookings, dateFrom, dateTo]);

  const cashBalance = cashTxns.reduce((s, t) => t.type === 'إيراد' ? s + (t.amount || 0) : s - (t.amount || 0), 0);
  const bankBalance = bankTxns.reduce((s, t) => t.type === 'إيراد' ? s + (t.amount || 0) : s - (t.amount || 0), 0);
  const totalRevenue = [...cashTxns, ...bankTxns].filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const handlePrint = () => {
    let html = '';
    if (activeTab === 'financial') {
      html = buildFinancialPage(hallSettings, { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, cashBalance, bankBalance }, dateFrom, dateTo);
    } else if (activeTab === 'bookings') {
      html = buildBookingsPage(hallSettings, filteredBookings, dateFrom, dateTo);
    } else if (activeTab === 'expenses') {
      html = buildExpensesPage(hallSettings, filteredExpenses, dateFrom, dateTo);
    } else if (activeTab === 'occupancy') {
      html = buildOccupancyPage(hallSettings, occupancyData, filteredBookings, dateFrom, dateTo);
    } else if (activeTab === 'cash') {
      html = buildCashPage(hallSettings, filteredCash, cashTxns, dateFrom, dateTo);
    } else if (activeTab === 'bank') {
      html = buildBankPage(hallSettings, filteredBank, bankTxns, dateFrom, dateTo);
    }
    openPrintWindow(html, `تقرير - ${activeTab}`);
  };

  const statusColor = (s) => s === 'مؤكد' ? 'bg-green-100 text-green-700 border-green-200' : s === 'معلق' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';

  const cashOpening = useMemo(() => cashTxns.filter(t => t.transaction_date < dateFrom).reduce((s, t) => t.type === 'إيراد' ? s + (t.amount || 0) : s - (t.amount || 0), 0), [cashTxns, dateFrom]);
  const bankOpening = useMemo(() => bankTxns.filter(t => t.transaction_date < dateFrom).reduce((s, t) => t.type === 'إيراد' ? s + (t.amount || 0) : s - (t.amount || 0), 0), [bankTxns, dateFrom]);
  const cashPeriodIn = filteredCash.filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const cashPeriodOut = filteredCash.filter(t => t.type === 'مصروف').reduce((s, t) => s + (t.amount || 0), 0);
  const bankPeriodIn = filteredBank.filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const bankPeriodOut = filteredBank.filter(t => t.type === 'مصروف').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div>
      <PageHeader title="التقارير" description="تقارير تشغيلية ومالية" />

      <div className="flex flex-wrap items-end gap-3 mb-6 bg-card p-4 rounded-2xl border border-border/70 shadow-sm">
        <HijriDatePicker
          label="من تاريخ"
          value={{ hijri: dateFromHijri, gregorian: dateFrom }}
          onChange={({ hijri, gregorian }) => { setDateFrom(gregorian); setDateFromHijri(hijri); }}
        />
        <HijriDatePicker
          label="إلى تاريخ"
          value={{ hijri: dateToHijri, gregorian: dateTo }}
          onChange={({ hijri, gregorian }) => { setDateTo(gregorian); setDateToHijri(hijri); }}
        />
        
        {/* Quick Date Range Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => {
              const start = '2026-01-01';
              const end = '2026-12-31';
              setDateFrom(start);
              setDateFromHijri(gregorianToHijri(start));
              setDateTo(end);
              setDateToHijri(gregorianToHijri(end));
            }}
            className="text-xs font-bold rounded-xl h-9"
          >
            جميع السجلات (1448هـ)
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => {
              const start = '2026-07-01';
              const end = '2026-09-30';
              setDateFrom(start);
              setDateFromHijri(gregorianToHijri(start));
              setDateTo(end);
              setDateToHijri(gregorianToHijri(end));
            }}
            className="text-xs font-bold rounded-xl h-9"
          >
            الربع الحالي (3 أشهر)
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => {
              const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
              const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
              setDateFrom(start);
              setDateFromHijri(gregorianToHijri(start));
              setDateTo(end);
              setDateToHijri(gregorianToHijri(end));
            }}
            className="text-xs font-bold rounded-xl h-9"
          >
            الشهر الحالي
          </Button>
        </div>

        <div className="mr-auto">
          <Button onClick={handlePrint} className="gap-2 rounded-xl h-9 shadow-sm bg-primary font-bold">
            <Printer className="w-4 h-4" />
            طباعة هذا التقرير
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted flex-wrap h-auto gap-1">
          <TabsTrigger value="financial">التقرير المالي</TabsTrigger>
          <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="occupancy">نسبة التشغيل</TabsTrigger>
          <TabsTrigger value="cash">الخزينة</TabsTrigger>
          <TabsTrigger value="bank">البنك</TabsTrigger>
        </TabsList>

        {/* ── FINANCIAL ── */}
        <TabsContent value="financial">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <StatCard title="إجمالي الإيرادات" value={formatCurrency(totalRevenue)} icon={TrendingUp} className="bg-card" />
            <StatCard title="إجمالي المصروفات" value={formatCurrency(totalExpenses)} icon={TrendingDown} className="bg-card" />
            <StatCard title="صافي الربح" value={formatCurrency(totalRevenue - totalExpenses)} icon={BarChart3} className="bg-card" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard title="رصيد الخزينة (الكلي)" value={formatCurrency(cashBalance)} icon={Wallet} className="bg-card" />
            <StatCard title="رصيد البنك (الكلي)" value={formatCurrency(bankBalance)} icon={Building2} className="bg-card" />
          </div>
        </TabsContent>

        {/* ── BOOKINGS ── */}
        <TabsContent value="bookings">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader><CardTitle className="text-base">الحجوزات ({filteredBookings.length})</CardTitle></CardHeader>
            <CardContent>
              {filteredBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الحجز</TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">المتبقي</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.booking_number}</TableCell>
                          <TableCell className="text-sm font-medium">{b.customer_name}</TableCell>
                          <TableCell>{showDate(b.event_date, b.event_date_hijri)}</TableCell>
                          <TableCell className="text-sm">{b.event_type}</TableCell>
                          <TableCell className="font-medium text-sm">{formatCurrency(b.final_amount)}</TableCell>
                          <TableCell className={`font-medium text-sm ${(b.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(b.remaining_amount)}</TableCell>
                          <TableCell><Badge variant="outline" className={statusColor(b.status)}>{b.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">لا توجد حجوزات في هذه الفترة</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EXPENSES ── */}
        <TabsContent value="expenses">
          <div className="mb-4">
            <Select value={expenseFilter} onValueChange={setExpenseFilter}>
              <SelectTrigger className="w-52"><SelectValue placeholder="تصفية حسب النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {['كهرباء', 'عمالة', 'صيانة', 'رواتب', 'إدارية', 'طارئة', 'بنكية', 'أخرى'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader><CardTitle className="text-base">المصروفات ({filteredExpenses.length}) — {formatCurrency(filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0))}</CardTitle></CardHeader>
            <CardContent>
              {filteredExpenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الوصف</TableHead>
                        <TableHead className="text-right">الطريقة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map(e => (
                        <TableRow key={e.id}>
                          <TableCell>{showDate(e.expense_date, null)}</TableCell>
                          <TableCell className="text-sm">{e.expense_type}</TableCell>
                          <TableCell className="text-sm">{e.description || '-'}</TableCell>
                          <TableCell className="text-sm">{e.payment_method}</TableCell>
                          <TableCell className="font-medium text-sm">{formatCurrency(e.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">لا توجد مصروفات</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── OCCUPANCY ── */}
        <TabsContent value="occupancy">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard title="إجمالي الأيام" value={occupancyData.total} icon={Calendar} className="bg-card" />
            <StatCard title="أيام مشغولة" value={occupancyData.busy} icon={CheckCircle} className="bg-card" />
            <StatCard title="أيام فارغة" value={occupancyData.free} icon={XCircle} className="bg-card" />
            <StatCard title="نسبة التشغيل" value={`${occupancyData.rate}%`} icon={BarChart3} className="bg-card" />
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500 flex items-center justify-center text-xs font-bold text-primary-foreground"
                  style={{ width: `${Math.max(occupancyData.rate, 5)}%` }}>
                  {occupancyData.rate}%
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CASH ── */}
        <TabsContent value="cash">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-600 mb-1">الرصيد الافتتاحي</p>
              <p className="font-bold text-lg">{formatCurrency(cashOpening)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 mb-1">إيرادات الفترة</p>
              <p className="font-bold text-lg text-green-700">{formatCurrency(cashPeriodIn)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-xs text-red-600 mb-1">مصروفات الفترة</p>
              <p className="font-bold text-lg text-red-700">{formatCurrency(cashPeriodOut)}</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-xs text-primary mb-1">الرصيد الختامي</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(cashOpening + cashPeriodIn - cashPeriodOut)}</p>
            </div>
          </div>
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader><CardTitle className="text-base">حركات الخزينة ({filteredCash.length})</CardTitle></CardHeader>
            <CardContent>
              {filteredCash.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">البيان</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCash.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>{showDate(t.transaction_date, null)}</TableCell>
                          <TableCell className="text-sm">{t.reference_label || t.source || '-'}</TableCell>
                          <TableCell><Badge variant="outline" className={t.type === 'إيراد' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>{t.type}</Badge></TableCell>
                          <TableCell className={`font-medium text-sm ${t.type === 'إيراد' ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(t.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">لا توجد حركات</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BANK ── */}
        <TabsContent value="bank">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-600 mb-1">الرصيد الافتتاحي</p>
              <p className="font-bold text-lg">{formatCurrency(bankOpening)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 mb-1">إيرادات الفترة</p>
              <p className="font-bold text-lg text-green-700">{formatCurrency(bankPeriodIn)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-xs text-red-600 mb-1">مصروفات الفترة</p>
              <p className="font-bold text-lg text-red-700">{formatCurrency(bankPeriodOut)}</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-xs text-primary mb-1">الرصيد الختامي</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(bankOpening + bankPeriodIn - bankPeriodOut)}</p>
            </div>
          </div>
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader><CardTitle className="text-base">حركات البنك ({filteredBank.length})</CardTitle></CardHeader>
            <CardContent>
              {filteredBank.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">البيان</TableHead>
                        <TableHead className="text-right">الطريقة</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBank.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>{showDate(t.transaction_date, null)}</TableCell>
                          <TableCell className="text-sm">{t.reference_label || t.source || '-'}</TableCell>
                          <TableCell className="text-sm">{t.payment_method || '-'}</TableCell>
                          <TableCell><Badge variant="outline" className={t.type === 'إيراد' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>{t.type}</Badge></TableCell>
                          <TableCell className={`font-medium text-sm ${t.type === 'إيراد' ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(t.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">لا توجد حركات</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}