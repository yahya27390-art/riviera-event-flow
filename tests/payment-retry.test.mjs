import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = (await fs.readFile(new URL('../src/api/accountingOperations.js',import.meta.url),'utf8'))
  .replace("import { supabase } from '@/lib/supabase';",'const supabase = globalThis.accountingTestClient;');
let moduleId=0;
const load = () => import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')+'#'+(++moduleId));

test('lost-response retries survive module reload without a duplicate receipt; a later payment is distinct', async () => {
  const saved = new Map();
  globalThis.sessionStorage = { getItem: key => saved.get(key) || null,
    setItem: (key,value) => saved.set(key,value), removeItem: key => saved.delete(key) };
  const committed = new Map();
  let loseResponse=true;
  globalThis.accountingTestClient = { async rpc(_name,{p_request_id,p_payload}) {
    if (!committed.has(p_request_id)) committed.set(p_request_id,{id:p_request_id,amount:p_payload.amount});
    if (loseResponse) { loseResponse=false;return {error:{message:'response lost'}}; }
    return {data:committed.get(p_request_id)};
  } };
  const first=await load();
  await assert.rejects(first.recordBookingPayment({booking_id:'test',amount:100}),/response lost/);
  assert.equal(committed.size,1);assert.equal(saved.size,1);
  const reloaded=await load();
  const receipt=await reloaded.recordBookingPayment({amount:100,booking_id:'test'});
  assert.equal(receipt.amount,100);assert.equal(committed.size,1);assert.equal(saved.size,0);
  await reloaded.recordBookingPayment({amount:100,booking_id:'test'});
  assert.equal(committed.size,2);
});

test('duplicate clicks in flight share one request and one receipt', async () => {
  const saved=new Map();
  globalThis.sessionStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  let calls=0;
  globalThis.accountingTestClient={async rpc(_name,{p_request_id}){calls++;return {data:{id:p_request_id}};}};
  const api=await load();
  const [a,b]=await Promise.all([api.recordBookingPayment({amount:200,booking_id:'test'}),api.recordBookingPayment({booking_id:'test',amount:200})]);
  assert.equal(calls,1);assert.deepEqual(a,b);
});
