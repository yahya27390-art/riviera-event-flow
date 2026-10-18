import { test } from 'node:test';
import assert from 'node:assert/strict';
import rawMoment from 'moment-hijri';
import moment, { normalizeDateDigits } from '../src/lib/hijriMoment.js';
import { gregorianToHijri, hijriToGregorian, getHijriMonthGrid, HIJRI_DAYS } from '../src/lib/hijri.js';
import { gregorianStartColumn, civilDateLabel } from '../src/lib/calendarDates.js';
import { BOOKING_PRICE_PRESETS, DEFAULT_BOOKING_PRICE, DEFAULT_BOOKING_STATUS } from '../src/lib/bookingDefaults.js';
import { statementCustomers, matchesStatementCustomer } from '../src/lib/statementCustomers.js';

test('November 18, 2026 is under Wednesday, matching the selected-date label',()=>{
  const start=gregorianStartColumn(2026,11);
  assert.equal(start,0); // November 1 is Sunday, no leading placeholder.
  assert.equal(HIJRI_DAYS[(start+18-1)%7],'أربعاء');
  assert.match(civilDateLabel('2026-11-18'),/الأربعاء/);
});
test('every day in Gregorian 2025-2028 matches the Sunday-first grid column',()=>{
  for(let year=2025;year<=2028;year++) for(let month=1;month<=12;month++) {
    const count=new Date(Date.UTC(year,month,0)).getUTCDate();
    for(let day=1;day<=count;day++) assert.equal((gregorianStartColumn(year,month)+day-1)%7,new Date(Date.UTC(year,month-1,day)).getUTCDay());
  }
});
test('Hijri and Gregorian for the screenshot round-trip without moving the date',()=>{
  assert.equal(gregorianToHijri('2026-11-18'),'1448/06/08');
  assert.equal(hijriToGregorian('1448/06/08'),'2026-11-18');
  const {cells}=getHijriMonthGrid(1448,6);
  assert.equal(HIJRI_DAYS[cells.indexOf(8)%7],'أربعاء');
});
test('Arabic/Persian date input produces ASCII ISO output regardless of global locale',()=>{
  const locale=rawMoment.locale();
  try{
    rawMoment.locale('ar-sa');
    assert.equal(hijriToGregorian('١٤٤٨/٠٦/٠٨'),'2026-11-18');
    assert.equal(hijriToGregorian('۱۴۴۸/۰۶/۰۸'),'2026-11-18');
    assert.equal(moment('2026-11-18','YYYY-MM-DD').format('YYYY-MM-DD'),'2026-11-18');
    assert.equal(normalizeDateDigits('١٤٤٨/۰۶/08'),'1448/06/08');
    assert.equal(rawMoment.locale(),'ar-sa'); // adapter has no global side effect
  }finally{rawMoment.locale(locale);}
});
test('new bookings have exactly the requested preset prices and confirmed default',()=>{
  assert.deepEqual(BOOKING_PRICE_PRESETS,[5500,7000,8000,8500]);
  assert.equal(DEFAULT_BOOKING_PRICE,5500);assert.equal(DEFAULT_BOOKING_STATUS,'مؤكد');
});
test('customers without a phone never share a statement merely because phone/name is blank or identical',()=>{
  const bookings=[{id:'a',customer_name:'اسم متكرر',customer_phone:''},
    {id:'b',customer_name:'اسم متكرر',customer_phone:''},{id:'c',customer_name:'عميل',customer_phone:null}];
  const before=structuredClone(bookings);
  const customers=statementCustomers(bookings);
  assert.equal(customers.length,3);
  for(let i=0;i<customers.length;i++) assert.deepEqual(bookings.filter(b=>matchesStatementCustomer(b,customers[i])),[bookings[i]]);
  assert.deepEqual(bookings,before);
});
test('existing customers with a phone retain their original statement grouping',()=>{
  const bookings=[{id:'a',customer_name:'عميل',customer_phone:'0500000000'},
    {id:'b',customer_name:'عميل',customer_phone:'0500000000'}];
  const customers=statementCustomers(bookings);
  assert.equal(customers.length,1);
  assert.equal(bookings.filter(b=>matchesStatementCustomer(b,customers[0])).length,2);
});
