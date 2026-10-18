import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Embedded PostgreSQL. No credentials, network or production connections.
const db = new PGlite();
after(() => db.close());
const admin = '10000000-0000-0000-0000-000000000001';
const accountant = '10000000-0000-0000-0000-000000000002';
const outsider = '10000000-0000-0000-0000-000000000003';
const legacy = '20000000-0000-0000-0000-000000000001';
let sequence = 0;
const request = () => `30000000-0000-0000-0000-${String(++sequence).padStart(12, '0')}`;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid primary key, raw_app_meta_data jsonb);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
  GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
  INSERT INTO auth.users VALUES
    ('${admin}','{"accounting_access":true,"role":"admin"}'),
    ('${accountant}','{"accounting_access":true,"role":"accountant"}'),
    ('${outsider}','{}');`);
const schema = (await fs.readFile(new URL('../supabase_schema.sql', import.meta.url),'utf8'))
  .replace(/^CREATE EXTENSION.*$/gm,'');
await db.exec(schema);
await db.exec(`INSERT INTO public.bookings(id,booking_number,customer_name,customer_phone,event_date,
  items,total_amount,discount,final_amount,paid_amount,remaining_amount,status)
  VALUES('${legacy}','LEGACY-001','عميل تجريبي','0500000000','2026-11-20',
  '[{"item_name":"خدمة","total":3000}]',15000,1000,14000,4000,10000,'مؤكد');
  INSERT INTO public.payments(booking_id,amount,payment_method,payment_date) VALUES('${legacy}',3000,'نقدي','2026-09-01');
  INSERT INTO public.cash_transactions(type,source,amount,transaction_date) VALUES('إيراد','حجز',10000,'2026-09-01');
  INSERT INTO public.bank_transactions(type,source,amount,transaction_date) VALUES('إيراد','يدوي',3000,'2026-09-01');
  INSERT INTO public.expenses(amount,expense_date) VALUES(1000,'2026-09-02');`);
const tables = ['bookings','payments','cash_transactions','bank_transactions','expenses','customers','users','hall_settings'];
async function snapshot() {
  await db.exec('RESET ROLE');
  const result = {};
  for (const table of tables) result[table] = (await db.query(`SELECT jsonb_strip_nulls(to_jsonb(t)) AS row FROM public.${table} t ORDER BY id`)).rows;
  return result;
}
const beforeMigration = await snapshot();
for (const file of ['202610180001_preserve_ledger.sql','202610180002_atomic_ledger_entries.sql','202610180003_consistent_backup.sql']) {
  await db.exec(await fs.readFile(new URL('../supabase/migrations/' + file, import.meta.url),'utf8'));
}
async function asUser(id = accountant) {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SET ROLE authenticated;`);
}
async function rpc(name, payload, id = request()) {
  await asUser();
  return (await db.query(`SELECT public.${name}($1::uuid,$2::jsonb) AS result`,[id,JSON.stringify(payload)])).rows[0].result;
}
const payment = amount => ({ booking_id: legacy, amount, payment_method: 'نقدي', payment_date: '2026-10-18' });

test('migration preserves every existing booking, receipt, ledger row and balance exactly', async () => {
  assert.deepEqual(await snapshot(), beforeMigration);
});
test('anonymous users cannot read records or invoke financial operations', async () => {
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM public.bookings'), /permission denied/);
  await assert.rejects(db.query(`SELECT public.record_booking_payment($1,$2)`,[request(),JSON.stringify(payment(10))]), /permission denied/);
});
test('unapproved authenticated user has no rows and cannot call mutation RPC', async () => {
  await asUser(outsider);
  assert.equal((await db.query('SELECT * FROM public.bookings')).rows.length,0);
  await assert.rejects(db.query(`SELECT public.record_booking_payment($1,$2)`,[request(),JSON.stringify(payment(10))]), /غير مصرح/);
});
test('accountant cannot rewrite balances, grant roles or edit security settings', async () => {
  await asUser();
  await assert.rejects(db.query(`UPDATE public.bookings SET paid_amount=0 WHERE id='${legacy}'`), /permission denied/);
  await assert.rejects(db.query("INSERT INTO public.users(email,role) VALUES('fake@example.test','admin')"), /permission denied/);
  assert.equal((await db.query("UPDATE public.hall_settings SET notes='hacked' RETURNING id")).rows.length,0);
});
test('payment adds only its requested amount without reconciling legacy mismatch', async () => {
  const id = request();
  const result = await rpc('record_booking_payment',payment(250),id);
  assert.equal(Number(result.booking.paid_amount),4250);
  assert.equal(Number(result.booking.remaining_amount),9750);
  assert.equal(Number(result.payment.amount),250);
  const after = await snapshot();
  assert.equal(after.payments.length,beforeMigration.payments.length+1);
  assert.equal(after.cash_transactions.length,beforeMigration.cash_transactions.length+1);
  assert.deepEqual(after.bank_transactions,beforeMigration.bank_transactions);
  const repeated = await rpc('record_booking_payment',payment(250),id);
  assert.deepEqual(repeated,result);
  assert.deepEqual(await snapshot(),after);
  await assert.rejects(rpc('record_booking_payment',payment(251),id),/معرف العملية/);
  assert.deepEqual(await snapshot(),after);
});
test('invalid or excessive payments leave all records unchanged', async () => {
  const before = await snapshot();
  for(const amount of [-1,0,100000,0.001,'NaN']) {
    await assert.rejects(rpc('record_booking_payment',payment(amount)));
    assert.deepEqual(await snapshot(),before);
  }
});
test('ledger failure rolls back receipt, booking balance and request key', async () => {
  await db.exec(`RESET ROLE; CREATE FUNCTION public.test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated failure'; END $$;
    CREATE TRIGGER test_failure BEFORE INSERT ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.test_fail();`);
  const before = await snapshot();
  await assert.rejects(rpc('record_booking_payment',{...payment(100),payment_method:'مدى'}),/simulated failure/);
  assert.deepEqual(await snapshot(),before);
  await db.exec('RESET ROLE; DROP TRIGGER test_failure ON public.bank_transactions');
});
test('new contract and deposit are one atomic operation', async () => {
  const id=request();
  const payload = { booking_number:'NEW-001',customer_name:'تجريبي جديد',customer_phone:'0500000001',
    event_date:'2026-12-01',base_price:12000,items:[],total_amount:12000,discount:1000,initial_payment_amount:2000,initial_payment_method:'نقدي' };
  const result=await rpc('create_booking_with_deposit',payload,id);
  assert.equal(Number(result.paid_amount),2000); assert.equal(Number(result.remaining_amount),9000);
  const after=await snapshot();
  assert.deepEqual(await rpc('create_booking_with_deposit',payload,id),result);
  assert.deepEqual(await snapshot(),after);
  await assert.rejects(rpc('create_booking_with_deposit',{...payload,booking_number:'NEW-INVALID',initial_payment_amount:20000}));
  assert.deepEqual(await snapshot(),after);
});
test('editing customer notes preserves all financial amounts and ledger rows', async () => {
  const before=await snapshot();
  await asUser();
  const result=(await db.query('SELECT public.update_booking_safely($1,$2) AS result',[legacy,JSON.stringify({notes:'تعديل ملاحظة',paid_amount:0,remaining_amount:0})])).rows[0].result;
  const saved=before.bookings.find(x=>x.row.id===legacy).row;
  for(const key of ['paid_amount','remaining_amount','total_amount','final_amount','discount']) assert.equal(result[key],saved[key]);
  const after=await snapshot();
  for(const table of ['payments','cash_transactions','bank_transactions','expenses']) assert.deepEqual(after[table],before[table]);
});
test('stale contract edit cannot overwrite a newer change', async () => {
  await asUser();
  await assert.rejects(db.query('SELECT public.update_booking_safely($1,$2)',[legacy,JSON.stringify({total_amount:10000,final_amount:9000,updated_at:'2000-01-01T00:00:00Z'})]),/الحجز تغيّر/);
});
test('transfers append exactly one balanced pair; retries do not duplicate it', async () => {
  const before=await snapshot();
  const payload={kind:'transfer',account:'cash',direction:'toBank',amount:500,transaction_date:'2026-10-18'};
  const id=request();
  await rpc('record_ledger_operation',payload,id);
  const after=await snapshot();
  const addedCash=after.cash_transactions.filter(x=>!before.cash_transactions.some(y=>y.row.id===x.row.id));
  const addedBank=after.bank_transactions.filter(x=>!before.bank_transactions.some(y=>y.row.id===x.row.id));
  assert.equal(addedCash.length,1);assert.equal(addedBank.length,1);
  assert.equal(addedCash[0].row.reference_id,addedBank[0].row.reference_id);
  assert.equal(addedCash[0].row.type,'مصروف');assert.equal(addedBank[0].row.type,'إيراد');
  assert.equal(addedCash[0].row.amount,addedBank[0].row.amount);
  await rpc('record_ledger_operation',payload,id);
  assert.deepEqual(await snapshot(),after);
});
test('even privileged clients cannot delete historical financial rows', async () => {
  const before=await snapshot();
  await assert.rejects(db.exec('DELETE FROM public.cash_transactions'),/السجلات المالية/);
  await assert.rejects(db.exec(`DELETE FROM public.bookings WHERE id='${legacy}'`),/السجلات المالية/);
  assert.deepEqual(await snapshot(),before);
});

test('two separate payments both increment the saved balance', async () => {
  const before=await snapshot();
  const previous=before.bookings.find(x=>x.row.id===legacy).row;
  await rpc('record_booking_payment',payment(10));
  await rpc('record_booking_payment',payment(20));
  const after=await snapshot();
  const current=after.bookings.find(x=>x.row.id===legacy).row;
  assert.equal(current.paid_amount,previous.paid_amount+30);
  assert.equal(current.remaining_amount,previous.remaining_amount-30);
});
test('new contract is rolled back if its deposit cannot reach the bank ledger', async () => {
  const before=await snapshot();
  await db.exec('CREATE TRIGGER test_failure BEFORE INSERT ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.test_fail()');
  await assert.rejects(rpc('create_booking_with_deposit',{ booking_number:'ROLLBACK-001',customer_name:'اختبار',
    customer_phone:'0500000002',event_date:'2026-12-05',total_amount:1000,initial_payment_amount:100,
    initial_payment_method:'مدى' }),/simulated failure/);
  assert.deepEqual(await snapshot(),before);
  await db.exec('DROP TRIGGER test_failure ON public.bank_transactions');
});
test('canceling a booking retains its payments and all balances', async () => {
  const before=await snapshot();
  await asUser();
  await db.query('SELECT public.update_booking_safely($1,$2)',[legacy,JSON.stringify({status:'ملغي'})]);
  const after=await snapshot();
  const previous=before.bookings.find(x=>x.row.id===legacy).row;
  const current=after.bookings.find(x=>x.row.id===legacy).row;
  assert.equal(current.paid_amount,previous.paid_amount);assert.equal(current.remaining_amount,previous.remaining_amount);
  for(const table of ['payments','cash_transactions','bank_transactions','expenses']) assert.deepEqual(after[table],before[table]);
  await assert.rejects(rpc('record_booking_payment',payment(10)),/ملغي/);
});
test('backup requires administrator and exports all tables without any writes', async () => {
  const before=await snapshot();
  await asUser();
  await assert.rejects(db.query('SELECT public.accounting_snapshot()'),/المدير/);
  await asUser(admin);
  const result=(await db.query('SELECT public.accounting_snapshot() AS result')).rows[0].result;
  for(const table of tables) assert.equal(result[table].length,before[table].length);
  assert.deepEqual(await snapshot(),before);
});
test('account revocation immediately blocks a previously authenticated actor', async () => {
  await db.exec(`RESET ROLE; UPDATE auth.users SET raw_app_meta_data=raw_app_meta_data || '{"disabled":true}' WHERE id='${accountant}'`);
  await asUser();
  assert.equal((await db.query('SELECT * FROM public.bookings')).rows.length,0);
  await assert.rejects(db.query('SELECT public.record_booking_payment($1,$2)',[request(),JSON.stringify(payment(1))]),/غير مصرح/);
});

test('migration refuses to change permissions before a replacement admin is ready', async () => {
  const isolated = new PGlite();
  try {
    await isolated.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid,raw_app_meta_data jsonb); CREATE TABLE public.baseline(id integer); INSERT INTO public.baseline VALUES(7)');
    const migration = await fs.readFile(new URL('../supabase/migrations/202610180001_preserve_ledger.sql',import.meta.url),'utf8');
    await assert.rejects(isolated.exec(migration),/تجهيز حساب مدير/);
    await isolated.exec('ROLLBACK');
    assert.deepEqual((await isolated.query('SELECT * FROM public.baseline')).rows,[{id:7}]);
    assert.equal((await isolated.query("SELECT to_regclass('public.accounting_requests') AS table_name")).rows[0].table_name,null);
  } finally { await isolated.close(); }
});
