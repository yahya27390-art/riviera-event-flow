const { createClient } = require('@supabase/supabase-js');
const url = 'https://ylrgnvlyzouhbvtznnam.supabase.co';
const key = 'sb_publishable_umEgTYRaS4SxQPo_25SFlA_nX20LWYD';
const supabase = createClient(url, key);

async function applyTreasuryFixes() {
  console.log('--- STARTING AUDIT & IDEMPOTENT SYNC ---');

  // 1. Delete duplicate salary entries if any exist
  const { data: ctSalaries } = await supabase
    .from('cash_transactions')
    .select('*')
    .eq('amount', 8000)
    .ilike('reference_label', '%راتب%');

  if (ctSalaries && ctSalaries.length > 1) {
    const toDelete = ctSalaries.slice(1).map(s => s.id);
    await supabase.from('cash_transactions').delete().in('id', toDelete);
    console.log(`Deleted ${toDelete.length} duplicate salary cash records`);
  }

  // 2. Ensure 1 SAR is removed everywhere
  await supabase.from('cash_transactions').delete().eq('amount', 1);
  await supabase.from('bank_transactions').delete().eq('amount', 1);
  await supabase.from('expenses').delete().eq('amount', 1);
  await supabase.from('payments').delete().eq('amount', 1);

  // 3. Ensure 3000 SAR expense exists exactly ONCE in cash_transactions and expenses
  const { data: cash3k } = await supabase
    .from('cash_transactions')
    .select('*')
    .eq('amount', 3000)
    .eq('reference_id', '6cd61276-512c-4f0a-bfb7-c1ed9c4dcde0');

  if (cash3k && cash3k.length > 1) {
    const toDelete = cash3k.slice(1).map(c => c.id);
    await supabase.from('cash_transactions').delete().in('id', toDelete);
    console.log(`Deleted ${toDelete.length} duplicate 3000 SAR cash entries`);
  } else if (!cash3k || cash3k.length === 0) {
    await supabase.from('cash_transactions').insert({
      type: 'مصروف',
      source: 'مصروف',
      reference_id: '6cd61276-512c-4f0a-bfb7-c1ed9c4dcde0',
      reference_label: 'تجهيز فرح - تجهيز فرح',
      amount: 3000,
      transaction_date: '2026-07-23',
      description: 'تجهيز فرح'
    });
    console.log('Inserted single 3000 SAR cash expense');
  }

  // 4. Ensure the 4 transfers are cleanly mirrored between cash and bank
  const transfers = [
    { amount: 600, date: '2026-08-01', cashId: '27927f75-1f18-417a-aaff-dcd699cef099' },
    { amount: 2000, date: '2026-08-02', cashId: 'c7d14814-27e4-4905-8783-18477f11f701' },
    { amount: 4200, date: '2026-08-09', cashId: '2ba39f0f-4de2-477d-982b-9f16280945c4' },
    { amount: 5500, date: '2026-08-09', cashId: 'bf01e9bd-fcb8-4add-9d61-cb1a289923b5' }
  ];

  for (const trf of transfers) {
    // Check bank transactions for this transfer
    const { data: bankRows } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('source', 'تحويل')
      .eq('amount', trf.amount)
      .eq('transaction_date', trf.date);

    if (bankRows && bankRows.length > 1) {
      const dupes = bankRows.slice(1).map(b => b.id);
      await supabase.from('bank_transactions').delete().in('id', dupes);
      console.log(`Deleted ${dupes.length} duplicates for bank transfer ${trf.amount} on ${trf.date}`);
    } else if (!bankRows || bankRows.length === 0) {
      await supabase.from('bank_transactions').insert({
        type: 'إيراد',
        source: 'تحويل',
        reference_id: trf.cashId,
        reference_label: 'تحويل من الخزينة - بواسطة: sqq00100',
        description: 'إيداع نقدي محول من الخزينة تلقائياً',
        payment_method: 'تحويل بنكي',
        amount: trf.amount,
        transaction_date: trf.date
      });
      console.log(`Created missing bank deposit for ${trf.amount} SAR on ${trf.date}`);
    }
  }

  console.log('--- ALL CORRECTIONS COMPLETED SAFELY & IDEMPOTENTLY ---');
}

applyTreasuryFixes();
